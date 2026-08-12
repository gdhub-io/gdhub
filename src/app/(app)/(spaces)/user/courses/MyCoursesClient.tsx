"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, theme } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { useSetSpaceHeader } from "@/components/layouts/SpaceHeader";
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

export default function MyCoursesClient() {
	const { t } = useTranslate();

	// A list page is not a space, but it is still "where you are": the trail
	// names it after the logo, with no switcher because there is nothing here
	// to switch between.
	useSetSpaceHeader(
		useMemo(
			() => ({
				trail: { current: { label: t("hub.menu.my-courses", "My courses") } },
			}),
			[t],
		),
	);
	const { token } = theme.useToken();
	const queryClient = useQueryClient();
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	const handleCreated = async () => {
		setIsCreateOpen(false);
		await queryClient.invalidateQueries({ queryKey: ["my-courses"] });
	};

	return (
		<div className="layout-background">
			<ProtectedPageHeader
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
			/>
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
		</div>
	);
}
