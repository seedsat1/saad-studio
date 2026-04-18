import Stripe from "stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { allocateSubscriptionCredits } from "@/lib/credit-ledger"
import { SAAD_PLANS } from "@/lib/pricing-models"

export const dynamic = 'force-dynamic';

/**
 * Resolve plan from Stripe price amount (in cents).
 * Maps to SAAD_PLANS by matching monthly USD price.
 */
function resolvePlanFromPrice(unitAmount: number | null, interval: string | null): { planId: string; billingInterval: "monthly" | "annual" } | null {
    if (!unitAmount) return null;
    const isAnnual = interval === "year";
    // For annual plans, Stripe price is yearly; divide by 12 to get monthly equivalent
    const monthlyUsd = isAnnual ? unitAmount / 100 / 12 : unitAmount / 100;

    // Find closest plan by price (±$2 tolerance)
    const plan = SAAD_PLANS.find((p) => Math.abs(p.monthlyUsd - monthlyUsd) <= 2);
    if (!plan) return null;
    return { planId: plan.id, billingInterval: isAnnual ? "annual" : "monthly" };
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

    const session = event.data.object as Stripe.Checkout.Session

    if (event.type === "checkout.session.completed") {
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        )

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

        await prismadb.userSubscription.create({
            data: {
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
        })

        // Allocate subscription credits (valid for 30 days)
        await allocateSubscriptionCredits(userId, planId, billingInterval);
    }

    if (event.type === "invoice.payment_succeeded") {
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        )

        const existingSub = await prismadb.userSubscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
            select: { userId: true, planId: true, billingInterval: true },
        });

        await prismadb.userSubscription.update({
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

        // Renew credits on payment (both monthly renewal and annual monthly cycle)
        if (existingSub?.userId && existingSub?.planId) {
            await allocateSubscriptionCredits(
                existingSub.userId,
                existingSub.planId,
                (existingSub.billingInterval as "monthly" | "annual") ?? "monthly",
            );
        }
    }

    return new NextResponse(null, { status: 200 })
};


