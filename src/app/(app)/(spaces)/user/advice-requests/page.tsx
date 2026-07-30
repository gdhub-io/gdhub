import type { Metadata } from "next";
import MyRequestsClient from "./MyRequestsClient";

export const metadata: Metadata = {
	title: "Advice Requests",
	robots: { index: false, follow: false },
	alternates: { canonical: "/user/advice-requests" },
	openGraph: {
		type: "website",
		url: "/user/advice-requests",
		title: "Advice Requests",
	},
};

export default function MyRequestsPage() {
	return <MyRequestsClient />;
}
