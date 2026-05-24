import type { Metadata } from "next";
import { InviteClient } from "./InviteClient";

type Params = Promise<{ token: string }>;

export const metadata: Metadata = {
	title: "Team Invitation",
};

export default async function InvitePage({ params }: { params: Params }) {
	const { token } = await params;
	return <InviteClient token={token} />;
}
