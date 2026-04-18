import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";
import { SAAD_PLANS } from "@/lib/pricing-models";

export const dynamic = 'force-dynamic';

const settingsUrl = absoluteUrl("/settings");

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const planId = url.searchParams.get("planId") ?? "pro";
    const billingInterval = url.searchParams.get("interval") ?? "monthly";
    const isAnnual = billingInterval === "annual";

    const plan = SAAD_PLANS.find((p) => p.id === planId) ?? SAAD_PLANS[2]; // default to "pro"

    const userSubscription = await prismadb.userSubscription.findUnique({
      where: {
        userId
      }
    })

    if (userSubscription && userSubscription.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: userSubscription.stripeCustomerId,
        return_url: settingsUrl,
      })

      return new NextResponse(JSON.stringify({ url: stripeSession.url }))
    }

    // Annual = monthly price × 12 (billed once per year)
    const unitAmount = isAnnual
      ? Math.round(plan.monthlyUsd * 12 * 100)
      : Math.round(plan.monthlyUsd * 100);

    const stripeSession = await stripe.checkout.sessions.create({
      success_url: settingsUrl,
      cancel_url: settingsUrl,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: user.emailAddresses[0].emailAddress,
      line_items: [
        {
          price_data: {
            currency: "USD",
            product_data: {
              name: `Saad Studio ${plan.name}`,
              description: `${plan.credits} credits/month — ${isAnnual ? "Annual" : "Monthly"} plan`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: isAnnual ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        planId: plan.id,
        billingInterval: isAnnual ? "annual" : "monthly",
      },
    })

    return new NextResponse(JSON.stringify({ url: stripeSession.url }))
  } catch (error) {
    console.log("stripe error", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
};
