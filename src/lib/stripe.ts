import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

import { randomUUID } from "crypto";

export const stripe = new Stripe(String(process.env.STRIPE_SECRET_KEY), {
  apiVersion: "2023-08-16",
});

export async function createCustomerIfNull() {
  const session = await getServerSession(authOptions);

  if (session) {
    const user = await prisma.user.findFirst({
      where: { email: session.user?.email },
    });

    if (!user?.api_key) {
      await prisma.user.update({
        where: {
          id: user?.id,
        },
        data: {
          api_key: "secret_" + randomUUID(),
        },
      });
    }

    if (!user?.stripe_customer_id) {
      const customer = await stripe.customers.create({
        email: String(user?.email),
      });

      await prisma.user.update({
        where: {
          id: user?.id,
        },
        data: {
          stripe_customer_id: customer.id,
        },
      });
    }

    const user_created = await prisma.user.findFirst({
      where: { email: session.user?.email },
    });
    return user_created?.stripe_customer_id;
  }
}

export async function hasSubscription() {
  const session = await getServerSession(authOptions);
  if (session) {
    const user = await prisma.user.findFirst({
      where: { email: session.user?.email },
    });

    const subscriptions = await stripe.subscriptions.list({
      customer: String(user?.stripe_customer_id),
    });

    return subscriptions.data.length > 0;
  }

  return false;
}

export async function createCheckoutLink(customer: string) {
  const checkout = await stripe.checkout.sessions.create({
    success_url: "http://localhost:3000/thank-you?success=true",
    cancel_url: "http://localhost:3000/thank-you?success=truee",
    customer: customer,
    line_items: [
      {
        price: "price_1NhQt8SHfr3x5ZShmmHPfNO0",
      },
    ],
    mode: "subscription",
  });

  return checkout.url;
}
