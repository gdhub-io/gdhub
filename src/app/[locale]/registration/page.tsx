import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import RegistrationClient from "./Client";

export const dynamic = "force-dynamic";

export default async function RegistrationPage({ params }: { params: { locale: "en" | "ru" } }) {
	const session = await getServerSession(authOptions);
	if (session?.user) {
		return null;
	}
	return <RegistrationClient locale={params.locale} />;
}
