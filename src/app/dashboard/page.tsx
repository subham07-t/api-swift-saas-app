import {
    createCheckoutLink,
    createCustomerIfNull,
    hasSubscription,
} from "@/lib/stripe";
import Link from "next/link";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";


import { PrismaClient } from "@prisma/client";
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


    // const top10RecentLogs = await prisma.log.createMany()

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
                                API Key
                            </p>
                            <p className="text-sm font-mono text-zinc-800 px-6 py-4">
                                {user?.api_key}
                            </p>
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
