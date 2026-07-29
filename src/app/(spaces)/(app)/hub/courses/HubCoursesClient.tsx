"use client";

import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import styles from "./style.module.scss";

const CoursesList = dynamic(
	() => import("@/components/CoursesList").then((m) => m.default),
	{ ssr: false },
);

export default function HubCoursesClient() {
	const { t } = useTranslate();

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("page.courses.title", "Courses")}
				subTitle={t("page.courses.subTitle", "Invest your time in knowledge")}
				extra={
					<Link href="/user/courses">
						<Button type="text">
							{t("page.courses.myCourses", "My Courses")}
						</Button>
					</Link>
				}
			/>
			<div className={styles.container}>
				<div className="project-vacancies" style={{ marginTop: 32 }}>
					<CoursesList location="hub" />
				</div>
			</div>
		</div>
	);
}
