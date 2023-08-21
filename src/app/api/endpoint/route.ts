import { NextRequest, NextResponse } from "next/server";

import { PrismaClient } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { randomUUID } from "crypto";
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const api_key = request.nextUrl.searchParams.get("api_key");

  if (!api_key) {
    return NextResponse.json(
      {
        error: "Must have a valid api key!",
      },
      { status: 401 }
    );
  }
  const user = await prisma.user.findFirst({
    where: {
      api_key: String(api_key),
    },
  });

  if (!user) {
    return NextResponse.json(
      {
        error: "There is no user with such api key!",
      },
      { status: 401 }
    );
  }
  const customer = await stripe.customers.retrieve(
    String(user?.stripe_customer_id)
  );

  const subscriptions = await stripe.subscriptions.list({
    customer: String(user?.stripe_customer_id),
  });

  const item = subscriptions.data.at(0)?.items.data.at(0);
  if (!item) {
    return NextResponse.json(
      {
        error: "You have no subscription.",
      },
      { status: 403 }
    );
  }

  await stripe.subscriptionItems.createUsageRecord(String(item?.id), {
    quantity: 1,
  });

  const data = randomUUID();
  const logResult = await prisma.log.create({
    data: {
      userId: String(user?.id),
      status: 200,
      method: "GET",
    },
  });

  return NextResponse.json(
    {
      status: true,
      special_key: data,
      logResult: logResult,
    },
    { status: 200 }
  );
}
