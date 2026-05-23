import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
	title: "My Profile",
	robots: { index: false, follow: false },
	alternates: { canonical: "/profile" },
	openGraph: { type: "website", url: "/profile", title: "My Profile" },
};

export default function ProfilePage() {
	return <ProfileClient />;
}
