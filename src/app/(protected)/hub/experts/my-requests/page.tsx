import type { Metadata } from "next";
import MyRequestsClient from "./MyRequestsClient";

export const metadata: Metadata = {
	title: "Advice Requests",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/experts/my-requests" },
	openGraph: {
		type: "website",
		url: "/hub/experts/my-requests",
		title: "Advice Requests",
	},
};

export default function MyRequestsPage() {
	return <MyRequestsClient />;
}
