import { MoreOutlined, SettingOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { IconCurrencyEuro } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Dropdown,
	Flex,
	type MenuProps,
	Modal,
	message,
	Space,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import React from "react";
import styles from "../CoursesList/style.module.scss";

const { Title, Text } = Typography;

export const CourseCard = ({
	course,
	token,
	onRefetch,
	showActions = false,
}: {
	course: prismaClient.Course & {
		direction?: prismaClient.WorkDirection | null;
		groups?: (prismaClient.CourseGroup & {
			curriculum?: prismaClient.CourseCurriculum | null;
			schedule?: prismaClient.CourseGroupSchedule[];
		})[];
	};
	token: any;
	onRefetch?: () => void;
	showActions?: boolean;
}) => {
	const { t } = useTranslate();
	const [modal, modalContextHolder] = Modal.useModal();

	const directionName = course.direction?.name || "";
	const directionClassName = directionName
		? "bg-direc-" + directionName.replace(" & ", "-").replace(" ", "-")
		: "";

	const firstGroup = course.groups?.[0];
	const firstSchedule = firstGroup?.schedule?.[0];
	const price = firstGroup?.curriculum?.price;

	const { mutateAsync: deleteCourse } = useMutation({
		mutationFn: (id: string) => axios.delete(`/api/user/course?id=${id}`),
		onSuccess: () => {
			message.success(t("course.delete.success", "Course deleted"));
			onRefetch?.();
		},
		onError: () => {
			message.error(t("course.delete.error", "Error deleting course"));
		},
	});

	const { mutateAsync: unpublishCourse } = useMutation({
		mutationFn: (id: string) => axios.put(`/api/user/course/${id}/unpublish`),
		onSuccess: () => {
			message.success(t("course.unpublish.success", "Course unpublished"));
			onRefetch?.();
		},
		onError: () => {
			message.error(t("course.unpublish.error", "Error unpublishing course"));
		},
	});

	const { mutateAsync: publishCourse } = useMutation({
		mutationFn: (id: string) => axios.put(`/api/user/course/${id}/publish`),
		onSuccess: () => {
			message.success(t("course.publish.success", "Course published"));
			onRefetch?.();
		},
		onError: () => {
			message.error(t("course.publish.error", "Error publishing course"));
		},
	});

	const getStatusTag = (status: prismaClient.$Enums.CourseStatus) => {
		switch (status) {
			case prismaClient.$Enums.CourseStatus.Draft:
				return <Tag color="default">{t("course.status.draft", "Draft")}</Tag>;
			case prismaClient.$Enums.CourseStatus.Published:
				return (
					<Tag color="success">
						{t("course.status.published", "Published")}
						{course.publishedAt &&
							` ${t("course.status.at", "at")} ${dayjs(course.publishedAt).format("lll")}`}
					</Tag>
				);
			default:
				return null;
		}
	};

	const getCourseMenu = (): MenuProps["items"] => {
		const menu: MenuProps["items"] = [];

		if (course.status === prismaClient.$Enums.CourseStatus.Draft) {
			menu.push({
				key: "publish",
				label: t("course.publish", "Publish"),
				onClick: () => publishCourse(course.id),
			});
		}

		if (course.status === prismaClient.$Enums.CourseStatus.Published) {
			menu.push({
				key: "unpublish",
				label: t("course.unpublish", "Unpublish"),
				onClick: () => unpublishCourse(course.id),
			});
		}

		menu.push(
			{
				key: "divider",
				type: "divider",
			},
			{
				key: "delete",
				label: t("course.delete", "Delete"),
				danger: true,
				onClick: () =>
					modal.confirm({
						centered: true,
						title: t(
							"course.delete.confirm",
							"Are you sure you want to delete this course?",
						),
						content: (
							<Text>
								{t(
									"course.delete.confirm.message",
									"This action cannot be undone",
								)}
							</Text>
						),
						onOk: () => deleteCourse(course.id),
						onCancel: () => {},
					}),
			},
		);

		return menu;
	};

	const cardContent = (
		<>
			<div
				className={[styles.cardContent, directionClassName]
					.filter(Boolean)
					.join(" ")}
			>
				{firstSchedule?.date && (
					<div className={styles.cardDate}>
						{t("courses.list.validUntil", "Starts at")}{" "}
						{dayjs(firstSchedule.date).format("ll")}
					</div>
				)}
			</div>

			<div className={styles.cardTitle}>
				<Space direction="vertical" size={0}>
					{directionName && <Text ellipsis>{directionName}</Text>}
					<Title
						ellipsis={{ rows: 2 }}
						level={2}
						style={{ margin: 0, height: "60.8px" }}
					>
						{course.name}
					</Title>
				</Space>
			</div>

			{showActions && (
				<Space direction="vertical" size="small" style={{ width: "100%" }}>
					{getStatusTag(course.status)}
					{course.language && (
						<Tag bordered={false} color="blue">
							{course.language}
						</Tag>
					)}
				</Space>
			)}

			<div className={styles.cardFooter}>
				<div className={styles.footerContent}>
					{price ? (
						<Flex align="center" gap={4}>
							<Text strong>Price:</Text>
							<Text strong>{price}</Text>
							<IconCurrencyEuro size={16} />
						</Flex>
					) : (
						<Text>Free</Text>
					)}
					<Text>terms of learning</Text>
				</div>

				{!showActions && (
					<Button
						type="primary"
						href={course.slug ? `/courses/${course.slug}` : undefined}
						className="black-btn"
					>
						{t("course-card.details-button", "Details")}
					</Button>
				)}
			</div>
		</>
	);

	if (showActions) {
		return (
			<>
				<Card
					className={styles.card}
					styles={{
						body: {
							padding: 8,
						},
					}}
					actions={[
						<Button
							key="manage"
							type="text"
							icon={<SettingOutlined />}
							href={`/my/courses/${course.id}`}
							title={t("course.manage", "Manage")}
						/>,
						course.slug ? (
							<Button
								key="view"
								type="text"
								icon={<GoLinkExternal />}
								href={`${course.language ? `/${course.language}` : ""}/courses/${course.slug}`}
								target="_blank"
								title={t("course.view", "View")}
							/>
						) : (
							<Button
								key="view"
								type="text"
								icon={<GoLinkExternal />}
								disabled
								title={t("course.view", "View")}
							/>
						),
						<Dropdown
							key="more"
							menu={{ items: getCourseMenu() }}
							trigger={["click"]}
						>
							<Button type="text" block icon={<MoreOutlined />} />
						</Dropdown>,
					]}
				>
					{cardContent}
				</Card>
				{modalContextHolder}
			</>
		);
	}

	return <div className={styles.card}>{cardContent}</div>;
};
