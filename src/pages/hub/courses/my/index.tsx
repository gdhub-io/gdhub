"use client";

import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Typography, theme } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const CourseCardBase = dynamic(
	() => import("@/components/courses/CourseCard").then((m) => m.CourseCard),
	{ ssr: false },
);
const CourseSection = dynamic(
	() =>
		import("@/components/courses/CourseSection").then((m) => m.CourseSection),
	{ ssr: false },
);
const CreateCourseModal = dynamic(
	() => import("@/components/modals/CreateCourseModal").then((m) => m.default),
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

	const [openCreateCourseModal, setOpenCreateCourseModal] = useState(false);
	const {
		data: courses,
		isSuccess,
		isLoading,
		refetch: refetchCourses,
	} = useQuery({
		queryKey: ["my-courses"],
		queryFn: () =>
			axios
				.get<{
					author: prismaClient.Course[];
					student: prismaClient.Course[];
					instructor: prismaClient.Course[];
				}>("/api/user/courses")
				.then((res) => res.data),
		enabled: !!session?.user,
	});

	const CourseCardWithActions = React.useCallback(
		({
			course,
			token: cardToken,
		}: {
			course: prismaClient.Course;
			token: ReturnType<typeof theme.useToken>["token"];
		}) => (
			<CourseCardBase
				course={course}
				token={cardToken}
				showActions={true}
				onRefetch={refetchCourses}
			/>
		),
		[refetchCourses],
	);

	return (
		<ProtectedLayout
			title={t("courses.myCourses", "My courses")}
			extra={
				<Button onClick={() => setOpenCreateCourseModal(true)}>
					{t("courses.createCourse", "Create course")}
				</Button>
			}
			showBackButton
			backButtonUrl="/hub/courses"
		>
			<div className={styles.container}>
				<CourseSection
					CardComponent={CourseCardWithActions}
					token={token}
					records={courses?.author ?? []}
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

			<CreateCourseModal
				open={openCreateCourseModal}
				onCancel={() => setOpenCreateCourseModal(false)}
				onCreate={() => {
					refetchCourses();
					setOpenCreateCourseModal(false);
				}}
			/>
		</ProtectedLayout>
	);
};

export default MyCoursesPage;
