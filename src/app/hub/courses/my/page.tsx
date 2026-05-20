"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, theme } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
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
const CreateCourseModal = dynamic(
	() => import("@/components/modals/CreateCourseModal"),
	{ ssr: false },
);

export default function MyCoursesPage() {
	const { t } = useTranslate();
	const { token } = theme.useToken();
	const queryClient = useQueryClient();
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	const handleCreated = async () => {
		setIsCreateOpen(false);
		await queryClient.invalidateQueries({ queryKey: ["my-courses"] });
	};

	return (
		<ProtectedLayout
			title={t("courses.myCourses", "My courses")}
			subTitle={t(
				"courses.myCoursesDescription",
				"Courses where you are an author, student, or instructor",
			)}
			extra={
				<Button type="primary" onClick={() => setIsCreateOpen(true)}>
					{t("courses.createCourse", "Create course")}
				</Button>
			}
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
			</div>

			<CreateCourseModal
				open={isCreateOpen}
				onCancel={() => setIsCreateOpen(false)}
				onCreate={handleCreated}
			/>
		</ProtectedLayout>
	);
}
