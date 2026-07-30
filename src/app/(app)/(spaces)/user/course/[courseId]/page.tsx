import type { Metadata } from "next";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";

export const metadata: Metadata = {
	title: "Course management",
	robots: { index: false, follow: false },
};

export default function UserCoursePage() {
	return (
		<>
			<ProtectedPageHeader title="Course management" />
			<div className="layout-background">In development</div>
		</>
	);
}
