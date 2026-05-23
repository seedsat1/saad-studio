import { auth } from "@clerk/nextjs/server";

import prismadb from "@/lib/prismadb";

export const checkSubscription = async () => {
  const { userId } = await auth();

  if (!userId) {
    return false;
  }

  const userSubscription = await prismadb.userSubscription.findUnique({
    where: {
      userId: userId,
    },
    select: {
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true,
    },
  })

  if (!userSubscription) {
    return false;
  }

  // STRICT TIMING: subscription is valid only while stripeCurrentPeriodEnd
  // is still in the future. No grace period of any kind.
  const isValid =
    userSubscription.stripePriceId &&
    (userSubscription.stripeCurrentPeriodEnd?.getTime() ?? 0) > Date.now();

  return !!isValid;  // guarantee it's a boolean
};
