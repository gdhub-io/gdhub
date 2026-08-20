"use client";

import {
	IconBook,
	IconBrush,
	IconCode,
	IconDeviceGamepad2,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Space, Tag, Typography } from "antd";
import axios from "axios";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useContentPageView } from "@/hooks/useContentViews";
import styles from "./style.module.scss";

const { Title, Paragraph } = Typography;

export default function CoursePage() {
	const { t } = useTranslate();
	const router = useRouter();
	const params = useParams<{ slug: string }>();
	const slug = params?.slug;

	const {
		data: course,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ["course", slug],
		queryFn: () => axios.get(`/api/courses/${slug}`).then((res) => res.data),
		enabled: !!slug,
	});

	useContentPageView("CoursePage", course?.id);

	if (isLoading) {
		return (
			<div className={styles.container}>
				<Paragraph>Loading course...</Paragraph>
			</div>
		);
	}

	if (isError || !course) {
		return (
			<div className={styles.container}>
				<Paragraph>Course not found</Paragraph>
				<Button onClick={() => router.push("/hub/courses")}>
					Back to courses
				</Button>
			</div>
		);
	}

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
						<Image
							src={course.image}
							alt={course.title}
							fill
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
