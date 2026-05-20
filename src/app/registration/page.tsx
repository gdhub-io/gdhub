import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegistrationClient } from "./RegistrationClient";

export const metadata: Metadata = {
	title: "Registration",
};

export default async function RegistrationPage() {
	const session = await auth();
	if (session?.user) {
		redirect("/hub");
	}
	return <RegistrationClient />;
}
