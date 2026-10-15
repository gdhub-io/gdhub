"use client";

import {
	IconBook,
	IconBrush,
	IconCode,
	IconDeviceGamepad2,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Space, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import { AppImage } from "@/components/ui/AppImage";
import { useContentPageView } from "@/hooks/useContentViews";
import styles from "./style.module.scss";

const { Title, Paragraph } = Typography;

export function CoursePageClient({ course }: { course: any }) {
	const { t } = useTranslate();
	const router = useRouter();
	useContentPageView("CoursePage", course?.id);

	function getCourseIcon(category: string) {
		switch (category?.toLowerCase()) {
			case "programming":
			case "development":
				return <IconCode size={24} />;
			case "game design":
			case "design":
				return <IconDeviceGamepad2 size={24} />;
			case "art":
			case "graphics":
				return <IconBrush size={24} />;
			default:
				return <IconBook size={24} />;
		}
	}

	return (
		<div className={styles.container}>
			<div className={styles.courseHeader}>
				<div className={styles.courseImage}>
					{course.image && (
						<AppImage
							src={course.image}
							alt={course.title}
							fill
							preload
							style={{ objectFit: "cover" }}
							sizes="(max-width: 800px) 100vw, 50vw"
						/>
					)}
				</div>
				<div className={styles.courseInfo}>
					<div className={styles.courseMeta}>
						<Space>
							<Tag icon={getCourseIcon(course.category)}>
								{course.category || "Course"}
							</Tag>
							{course.duration && <Tag>{course.duration}</Tag>}
							{course.isFree !== undefined && (
								<Tag color={course.isFree ? "green" : "red"}>
									{course.isFree
										? t("course.type.free", "Free")
										: t("course.type.paid", "Paid")}
								</Tag>
							)}
						</Space>
					</div>
					<Title level={1}>{course.title}</Title>
					{course.description && (
						<Paragraph className={styles.courseDescription}>
							{course.description}
						</Paragraph>
					)}
					<Space>
						<Button type="primary" size="large">
							{t("course.enroll", "Enroll in course")}
						</Button>
						<Button onClick={() => router.push("/hub/courses")}>
							{t("course.backToCourses", "Back to courses")}
						</Button>
					</Space>
				</div>
			</div>
		</div>
	);
}
