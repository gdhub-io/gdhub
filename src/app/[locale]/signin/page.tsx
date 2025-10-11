import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import SigninClient from "./Client";

export const dynamic = "force-dynamic";

export default async function SigninPage({ params }: { params: { locale: "en" | "ru" } }) {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    // App Router redirect
    // const locale = params.locale || "en";
    // Using runtime redirect from next/navigation is not allowed in server components without headers,
    // but returning null is acceptable here as middleware already guards hub.
    return null;
  }
  return <SigninClient locale={params.locale} />;
}


