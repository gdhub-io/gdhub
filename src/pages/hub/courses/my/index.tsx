"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Typography, theme } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import React from "react";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const CourseCard = dynamic(
	() => import("@/components/courses/CourseCard").then((m) => m.CourseCard),
	{ ssr: false },
);
const CourseSection = dynamic(
	() =>
		import("@/components/courses/CourseSection").then((m) => m.CourseSection),
	{ ssr: false },
);

const { Paragraph } = Typography;

/**
 * My courses page component that displays user's courses
 *
 * @returns {JSX.Element} Rendered component
 */
const MyCoursesPage: NextPageWithLayout = () => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const { token } = theme.useToken();
	const router = useRouter();

	const {
		data: myCourses,
		isSuccess,
		isLoading,
	} = useQuery({
		queryKey: ["my-courses"],
		queryFn: () => axios.get("/api/user/courses").then((res) => res.data),
		enabled: !!session?.user,
	});

	return (
		<ProtectedLayout
			title={t("courses.myCourses", "My courses")}
			subTitle={t(
				"courses.myCoursesDescription",
				"Courses where you are an author, student, or instructor",
			)}
			extra={<Button>{t("courses.createCourse", "Create course")}</Button>}
			showBackButton
			backButtonUrl="/hub/courses"
		>
			<div className={styles.container}>
				<CourseSection
					CardComponent={CourseCard}
					token={token}
					queryKey={["my-courses"]}
					queryFn={() => axios.get("/api/user/courses").then((res) => res.data)}
				/>

				{!isSuccess && !isLoading && (
					<Paragraph type="secondary">
						{t(
							"courses.noMyCourses",
							"You are not enrolled in any courses yet",
						)}
					</Paragraph>
				)}
			</div>
		</ProtectedLayout>
	);
};

export default MyCoursesPage;
