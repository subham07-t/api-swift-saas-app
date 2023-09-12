import {
  createCheckoutLink,
  createCustomerIfNull,
  hasSubscription,
  stripe,
} from "@/lib/stripe";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "./api/auth/[...nextauth]/route";
const prisma = new PrismaClient();

export default async function Page() {

  const session = await getServerSession(authOptions);
  const customer = await createCustomerIfNull();
  const checkoutLink = await createCheckoutLink(String(customer));
  const hasSub = await hasSubscription();


  const user = await prisma.user.findFirst({
    where: {
      email: session?.user?.email,
    },
  });

  let current_usage = 0

  if (hasSub) {
    const subscriptions = await stripe.subscriptions.list({
      customer: String(user?.stripe_customer_id),
    });

    const invoice = await stripe.invoices.retrieveUpcoming({
      subscription: subscriptions.data.at(0)?.id
    })

    current_usage = invoice.amount_due

  }

  const top10RecentLogs = await prisma.eventLog.findMany({
    where: {
      userId: user?.id
    }, orderBy: {
      created: "desc"
    },
    take: 10
  })

  return (
    <main>
      {hasSub ? (
        <>
          <div className="flex flex-col gap-4">

            <div className="rounded-md px-4 py-2 bg-emerald-400 font-medium text-sm text-white">
              You have a subscription!
            </div>

            <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-md">
              <p className="text-sm text-black px-6 py-4 font-medium">
                Current Usage
              </p>
              <p className="text-sm font-mono text-zinc-800 px-6 py-4">
                {current_usage / 2500}
              </p>
              <p className="text-sm text-black px-6 py-4 font-medium">
                API
              </p>
              <p className="text-sm font-mono text-zinc-800 px-6 py-4">
                api/endpoint/api_key=?
              </p>
            </div>

            <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-md">
              <p className="text-sm text-black px-6 py-4 font-medium">
                API Key
              </p>
              <p className="text-sm font-mono text-zinc-800 px-6 py-4">
                {user?.api_key}
              </p>
            </div>

            <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-md">
              <p className="text-sm text-black px-6 py-4 font-medium">
                LOG Events
              </p>

              {top10RecentLogs.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <p className="text-sm font-mono text-zinc-800 px-6 py-4"> {item.method}</p>
                  <p className="text-sm font-mono text-zinc-800 px-6 py-4"> {item.status}</p>
                  <p className="text-sm font-mono text-zinc-800 px-6 py-4"> {item.created.toDateString()}</p>
                </div>
              ))}

            </div>

          </div>
        </>
      ) : (
        <>
          <div className="min-h-[60vh] grid place-items-center rounded-lg px-6 py-10 bg-slate-100">
            <Link
              href={String(checkoutLink)}
              className="font-medium text-base hover:underline"
            >
              You have no subscription, checkout now!
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
