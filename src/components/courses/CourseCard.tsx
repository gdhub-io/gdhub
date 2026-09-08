import {
	IconBook,
	IconBrush,
	IconCode,
	IconDeviceGamepad2,
} from "@tabler/icons-react";
import { useTolgee } from "@tolgee/react";
import { Card, Tag } from "antd";
import Link from "next/link";
import React, { useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import styles from "./style.module.scss";

function getCourseIcon(category: string) {
	switch (category.toLowerCase()) {
		case "programming":
		case "development":
			return <IconCode size={28} />;
		case "game design":
		case "design":
			return <IconDeviceGamepad2 size={28} />;
		case "art":
		case "graphics":
			return <IconBrush size={28} />;
		case "general":
		default:
			return <IconBook size={28} />;
	}
}

export const CourseCard = ({ course, token }: { course: any; token: any }) => {
	const { t } = useTolgee();
	const [hovered, setHovered] = useState(false);

	const categoryLabels: Record<string, string> = {
		programming: "Programming",
		development: "Development",
		"game design": "Game Design",
		design: "Design",
		art: "Art",
		graphics: "Graphics",
		general: "General",
	};

	return (
		<Link href={`/course/${course.slug}`}>
			<Card
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				style={{
					borderRadius: "var(--gd-radius-panel)",
					overflow: "hidden",
					boxShadow: hovered ? token.boxShadowSecondary : token.boxShadow,
					background: token.colorBgContainer,
					display: "flex",
					flexDirection: "column",
					width: "100%",
					aspectRatio: "1/1.1",
					margin: "0 auto",
					cursor: "pointer",
					transition: "box-shadow 0.2s",
					border: undefined,
				}}
				styles={{
					body: {
						padding: 0,
						height: 0,
					},
				}}
				cover={
					course.image ? (
						<div
							style={{
								position: "relative",
								width: "100%",
								aspectRatio: "1/1.1",
								overflow: "hidden",
							}}
						>
							<AppImage
								src={course.image}
								alt={course.title}
								fill
								style={{ objectFit: "cover", aspectRatio: "1/1.1" }}
								sizes="(max-width: 600px) 100vw, 33vw"
							/>
							<div className={styles.courseCardContent}>
								<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
									<span className={styles.courseTypeIcon}>
										{getCourseIcon(course.category || "general")}
									</span>
									<span className={styles.courseType}>
										{categoryLabels[course.category] || "Course"}
									</span>
								</div>
								<div className={styles.courseTitle}>{course.title}</div>
								{course.shortDescription ? (
									<div className={styles.courseDesc}>
										{course.shortDescription}
									</div>
								) : null}
								<div
									style={{
										fontWeight: 600,
										color: hovered
											? token.colorError
											: token.colorTextSecondary,
										fontSize: 15,
										marginTop: 8,
										transition: "color 0.2s, opacity 0.2s",
										opacity: hovered ? 1 : 0,
									}}
								>
									{t("course.readMore", "Click to read more")}
								</div>
							</div>
							{course.duration && (
								<Tag
									style={{
										position: "absolute",
										top: 16,
										right: 16,
										zIndex: 3,
										background: token.colorBgContainer,
										color: token.colorText,
										fontWeight: 600,
									}}
								>
									{course.duration}
								</Tag>
							)}
							{course.isFree !== undefined && (
								<Tag
									color={course.isFree ? "green" : "red"}
									style={{
										position: "absolute",
										bottom: 16,
										right: 16,
										zIndex: 3,
										fontWeight: 600,
									}}
								>
									{course.isFree
										? t("course.type.free", "Free")
										: t("course.type.paid", "Paid")}
								</Tag>
							)}
						</div>
					) : null
				}
			/>
		</Link>
	);
};
