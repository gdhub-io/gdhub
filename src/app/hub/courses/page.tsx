"use client";

import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import styles from "@/pages/hub/courses/style.module.scss";

const CoursesList = dynamic(
	() => import("@/components/CoursesList").then((m) => m.default),
	{ ssr: false },
);

export default function HubCoursesPage() {
	const { t } = useTranslate();
	const pathname = usePathname();

	return (
		<ProtectedLayout
			title={t("page.courses.title", "Courses")}
			subTitle={t("page.courses.subTitle", "Invest your time in knowledge")}
			seo={{ openGraph: { type: "website", url: pathname ?? undefined } }}
			extra={
				<Link href="/hub/courses/my">
					<Button type="text">
						{t("page.courses.myCourses", "My Courses")}
					</Button>
				</Link>
			}
		>
			<div className={styles.container}>
				<div className="project-vacancies" style={{ marginTop: 32 }}>
					<CoursesList location="hub" />
				</div>
			</div>
		</ProtectedLayout>
	);
}
