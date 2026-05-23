import Stripe from "stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { allocateSubscriptionCredits } from "@/lib/credit-ledger"
import { SAAD_PLANS } from "@/lib/pricing-models"

export const dynamic = 'force-dynamic';

async function claimStripeEvent(event: Stripe.Event): Promise<boolean> {
    await prismadb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
            "id" TEXT PRIMARY KEY,
            "type" TEXT NOT NULL,
            "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const rows = await prismadb.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "StripeWebhookEvent" ("id", "type")
        VALUES (${event.id}, ${event.type})
        ON CONFLICT ("id") DO NOTHING
        RETURNING "id"
    `;

    return rows.length > 0;
}

async function releaseStripeEvent(eventId: string): Promise<void> {
    await prismadb.$executeRaw`
        DELETE FROM "StripeWebhookEvent"
        WHERE "id" = ${eventId}
    `;
}

/**
 * Resolve plan from Stripe price amount (in cents).
 * Maps to SAAD_PLANS by matching monthly USD price.
 */
function resolvePlanFromPrice(unitAmount: number | null, interval: string | null): { planId: string; billingInterval: "monthly" | "annual" } | null {
    if (!unitAmount) return null;
    const isAnnual = interval === "year";
    const paidUsd = unitAmount / 100;

    // Find closest plan by price (±$2 tolerance)
    const plan = SAAD_PLANS.find((p) => {
        const expectedUsd = isAnnual
            ? p.monthlyUsd * 12 * (1 - p.annualDiscount / 100)
            : p.monthlyUsd;
        return Math.abs(expectedUsd - paidUsd) <= 2;
    });
    if (!plan) return null;
    return { planId: plan.id, billingInterval: isAnnual ? "annual" : "monthly" };
}

function creditsForPlan(planId: string): number {
    return SAAD_PLANS.find((p) => p.id === planId)?.credits ?? 0;
}

async function recordStripeTransaction(input: {
    userId: string;
    planId: string;
    billingInterval: string;
    amountCents: number | null | undefined;
    credits: number;
    eventId: string;
    stripeObjectId: string;
    type: "checkout" | "renewal";
}) {
    await prismadb.adminTransaction.create({
        data: {
            userId: input.userId,
            plan: [
                `STRIPE_${input.type.toUpperCase()}:${input.planId}`,
                `interval:${input.billingInterval}`,
                `stripeObject:${input.stripeObjectId}`,
                `STRIPE_EVENT:${input.eventId}`,
            ].join(" | "),
            amount: Math.max(0, Number(input.amountCents ?? 0)) / 100,
            credits: Math.max(0, Math.floor(input.credits)),
            paymentStatus: "COMPLETED",
        },
    });
}

export async function POST(req: Request) {
    const body = await req.text()
    const signature = (await headers()).get("Stripe-Signature") as string

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (error: any) {
        return new NextResponse(`Stripe webhook error: ${error.message}`, { status: 400 })
    }

    const shouldProcess = await claimStripeEvent(event);
    if (!shouldProcess) {
        return NextResponse.json({ received: true, deduped: true }, { status: 200 });
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session
            const subscriptionId =
                typeof session.subscription === "string"
                    ? session.subscription
                    : session.subscription?.id;
            if (!subscriptionId) {
                return new NextResponse("Subscription id is required", { status: 400 });
            }
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)

            if (!session?.metadata?.userId) {
                return new NextResponse("User id is required", { status: 400 });
            }

            const userId = session.metadata.userId;
            const priceItem = subscription.items.data[0];
            const planInfo = resolvePlanFromPrice(
                priceItem.price.unit_amount,
                priceItem.price.recurring?.interval ?? null,
            );

            // Use metadata planId if provided, otherwise resolve from price
            const planId = session.metadata.planId ?? planInfo?.planId ?? "pro";
            const billingInterval = (session.metadata.billingInterval as "monthly" | "annual") ?? planInfo?.billingInterval ?? "monthly";

            await prismadb.userSubscription.upsert({
                where: { userId },
                create: {
                    userId,
                    stripeSubscriptionId: subscription.id,
                    stripeCustomerId: subscription.customer as string,
                    stripePriceId: priceItem.price.id,
                    stripeCurrentPeriodEnd: new Date(
                        subscription.current_period_end * 1000
                    ),
                    planId,
                    billingInterval,
                },
                update: {
                    stripeSubscriptionId: subscription.id,
                    stripeCustomerId: subscription.customer as string,
                    stripePriceId: priceItem.price.id,
                    stripeCurrentPeriodEnd: new Date(
                        subscription.current_period_end * 1000
                    ),
                    planId,
                    billingInterval,
                },
            })

            // Allocate subscription credits (valid for 30 days)
            await allocateSubscriptionCredits(userId, planId, billingInterval);
            await recordStripeTransaction({
                userId,
                planId,
                billingInterval,
                amountCents: session.amount_total ?? priceItem.price.unit_amount,
                credits: creditsForPlan(planId),
                eventId: event.id,
                stripeObjectId: session.id,
                type: "checkout",
            });
        }

        if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object as Stripe.Invoice
            const invoiceAny = invoice as any;
            const subscriptionId =
                typeof invoiceAny.subscription === "string"
                    ? invoiceAny.subscription
                    : invoiceAny.subscription?.id;
            if (!subscriptionId) {
                return NextResponse.json({ received: true, skipped: "missing_subscription" }, { status: 200 });
            }
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)

            const existingSub = await prismadb.userSubscription.findUnique({
                where: { stripeSubscriptionId: subscription.id },
                select: { userId: true, planId: true, billingInterval: true },
            });

            await prismadb.userSubscription.updateMany({
                where: {
                    stripeSubscriptionId: subscription.id,
                },
                data: {
                    stripePriceId: subscription.items.data[0].price.id,
                    stripeCurrentPeriodEnd: new Date(
                        subscription.current_period_end * 1000
                    ),
                },
            })

            const billingReason = typeof invoice.billing_reason === "string" ? invoice.billing_reason : "";
            if (billingReason === "subscription_create") {
                return NextResponse.json({ received: true, skipped: "initial_invoice_after_checkout" }, { status: 200 });
            }

            // Renew credits on payment (both monthly renewal and annual monthly cycle)
            if (existingSub?.userId && existingSub?.planId) {
                await allocateSubscriptionCredits(
                    existingSub.userId,
                    existingSub.planId,
                    (existingSub.billingInterval as "monthly" | "annual") ?? "monthly",
                );
                await recordStripeTransaction({
                    userId: existingSub.userId,
                    planId: existingSub.planId,
                    billingInterval: existingSub.billingInterval ?? "monthly",
                    amountCents: invoice.amount_paid,
                    credits: creditsForPlan(existingSub.planId),
                    eventId: event.id,
                    stripeObjectId: invoice.id,
                    type: "renewal",
                });
            }
        }

        // ─── Cancellation: user cancelled via Stripe portal, or Stripe
        //     auto-cancelled after retried payment failures. We must
        //     remove the DB row immediately so the user stops appearing
        //     "subscribed" while their cycle window is still open.
        if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object as Stripe.Subscription;
            const existing = await prismadb.userSubscription.findUnique({
                where: { stripeSubscriptionId: subscription.id },
                select: { userId: true, planId: true, billingInterval: true },
            });
            if (existing?.userId) {
                await prismadb.userSubscription.delete({
                    where: { stripeSubscriptionId: subscription.id },
                }).catch(() => {});
                console.log(
                    `[stripe-webhook] Subscription cancelled: user=${existing.userId} plan=${existing.planId} interval=${existing.billingInterval}`,
                );
            }
        }

        // ─── Mid-cycle plan change (upgrade / downgrade / interval flip).
        //     Stripe fires this whenever the user changes their plan via
        //     the Billing Portal. We re-resolve planId + billingInterval
        //     from the new price and re-allocate credits so the user gets
        //     the credits they paid for immediately.
        if (event.type === "customer.subscription.updated") {
            const subscription = event.data.object as Stripe.Subscription;
            const priceItem = subscription.items.data[0];
            if (priceItem) {
                const planInfo = resolvePlanFromPrice(
                    priceItem.price.unit_amount,
                    priceItem.price.recurring?.interval ?? null,
                );

                const existing = await prismadb.userSubscription.findUnique({
                    where: { stripeSubscriptionId: subscription.id },
                    select: { userId: true, planId: true, billingInterval: true, stripePriceId: true },
                });

                if (existing?.userId) {
                    const nextPlanId = planInfo?.planId ?? existing.planId ?? "pro";
                    const nextInterval = planInfo?.billingInterval ?? (existing.billingInterval as "monthly" | "annual") ?? "monthly";
                    const priceChanged = priceItem.price.id !== existing.stripePriceId;
                    const planChanged = nextPlanId !== existing.planId;
                    const intervalChanged = nextInterval !== existing.billingInterval;

                    await prismadb.userSubscription.update({
                        where: { stripeSubscriptionId: subscription.id },
                        data: {
                            stripePriceId: priceItem.price.id,
                            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                            planId: nextPlanId,
                            billingInterval: nextInterval,
                        },
                    });

                    // Only re-allocate when the plan actually changed
                    // (an upgrade/downgrade). Pure interval flips and
                    // metadata edits don't reset credits.
                    if (planChanged || (priceChanged && intervalChanged)) {
                        await allocateSubscriptionCredits(existing.userId, nextPlanId, nextInterval);
                        console.log(
                            `[stripe-webhook] Subscription plan changed: user=${existing.userId} ${existing.planId}/${existing.billingInterval} -> ${nextPlanId}/${nextInterval} (credits re-allocated)`,
                        );
                    } else {
                        console.log(
                            `[stripe-webhook] Subscription updated: user=${existing.userId} plan=${nextPlanId} interval=${nextInterval}`,
                        );
                    }
                }
            }
        }

        // ─── Payment failure. Stripe will retry on its own (smart
        //     retries) and eventually cancel if it gives up. We log
        //     here so it shows up in admin reports; you can wire an
        //     email notification in this block when desired.
        if (event.type === "invoice.payment_failed") {
            const invoice = event.data.object as Stripe.Invoice;
            const invoiceAny = invoice as any;
            const subscriptionId =
                typeof invoiceAny.subscription === "string"
                    ? invoiceAny.subscription
                    : invoiceAny.subscription?.id;
            if (subscriptionId) {
                const existing = await prismadb.userSubscription.findUnique({
                    where: { stripeSubscriptionId: subscriptionId },
                    select: { userId: true, planId: true },
                });
                console.warn(
                    `[stripe-webhook] Payment failed: user=${existing?.userId ?? "unknown"} plan=${existing?.planId ?? "?"} invoice=${invoice.id} attempt=${invoice.attempt_count}`,
                );
                // TODO (optional): trigger a "your payment failed" email
                // here. The subscription stays active until Stripe gives
                // up retrying and fires customer.subscription.deleted.
            }
        }
    } catch (error) {
        await releaseStripeEvent(event.id).catch(() => {});
        console.error("[stripe-webhook] processing error", error);
        return new NextResponse("Webhook processing failed", { status: 500 });
    }

    return new NextResponse(null, { status: 200 })
};
