import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SigninClient } from "./SigninClient";

export const metadata: Metadata = {
	title: "Sign in",
};

export default async function SigninPage() {
	const session = await auth();
	if (session?.user) {
		redirect("/hub");
	}
	return <SigninClient />;
}
