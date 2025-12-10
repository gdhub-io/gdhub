import { MoreOutlined, SettingOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { FaChalkboardTeacher } from "@react-icons/all-files/fa/FaChalkboardTeacher";
import { FaMicroscope } from "@react-icons/all-files/fa/FaMicroscope";
import { FaRegCalendarCheck } from "@react-icons/all-files/fa/FaRegCalendarCheck";
import { FaUsers } from "@react-icons/all-files/fa/FaUsers";
import { GiGamepad } from "@react-icons/all-files/gi/GiGamepad";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Alert,
	Button,
	Card,
	Col,
	Dropdown,
	Flex,
	Grid,
	Image,
	type MenuProps,
	Modal,
	message,
	Row,
	Space,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React from "react";
import { formatEventPeriod } from "@/helpers/format";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const CreateCourseButton = dynamic(
	() => import("@/components/events/CreateEventButton").then((m) => m.default),
	{ ssr: false },
);
const CourseModal = dynamic(
	() => import("@/components/modals/CreateCourseModal").then((m) => m.default),
	{ ssr: false },
);

const PageViews = dynamic(
	() =>
		import("@/components/PageViews").then((m) => m.PageViews).then((m) => m),
	{ ssr: false },
);

const { Text } = Typography;

const MyCoursesPage: NextPageWithLayout = () => {
	const { t, getLanguage } = useTolgee();
	const router = useRouter();
	const [modal, modalContextHolder] = Modal.useModal();
	const screens = Grid.useBreakpoint();
	const [editModalOpen, setEditModalOpen] = React.useState(false);
	const [editingCourse, setEditingCourse] = React.useState<any | null>(null);
	const [hoveredCourseId, setHoveredCourseId] = React.useState<string | null>(
		null,
	);

	// Получение курсов пользователя
	const {
		data = [],
		isLoading,
		refetch: refetchMyCourses,
	} = useQuery({
		queryKey: ["my-courses"],
		queryFn: () =>
			axios
				.get<{
					author: prismaClient.Course[];
					student: prismaClient.Course[];
					instructor: prismaClient.Course[];
				}>("/api/user/courses")
				.then((res) => res.data.author),
	});

	// Мутация для удаления курса
	const { mutateAsync: deleteCourse } = useMutation({
		mutationFn: (id: string) => axios.delete(`/api/user/course/${id}`),
		onSuccess: () => {
			message.success(t("course.delete.success", "Course deleted"));
			refetchMyCourses();
		},
		onError: () => {
			message.error(t("course.delete.error", "Error deleting course"));
		},
	});

	const { mutateAsync: unpublishCourse } = useMutation({
		mutationFn: (id: string) => axios.put(`/api/user/course/${id}/unpublish`),
		onSuccess: () => {
			message.success(t("course.unpublish.success", "Course unpublished"));
			refetchMyCourses();
		},
		onError: () => {
			message.error(t("course.unpublish.error", "Error unpublishing course"));
		},
	});

	const { mutateAsync: restoreCourse } = useMutation({
		mutationFn: (id: string) => axios.put(`/api/user/course/${id}/restore`),
		onSuccess: () => {
			message.success(t("course.restore.success", "Course is restored"));
			refetchMyCourses();
		},
		onError: () => {
			message.error(t("course.restore.error", "Error restoring course"));
		},
	});

	const { mutateAsync: generateSlug } = useMutation({
		mutationFn: (id: string) =>
			axios.put(`/api/user/course/${id}/generate-slug`),
		onSuccess: () => {
			message.success(t("course.generateSlug.success", "Slug generated"));
			refetchMyCourses();
		},
		onError: () => {
			message.error(t("course.generateSlug.error", "Error generating slug"));
		},
	});

	const handleEventRestore = async (id: string) => {
		await restoreCourse(id);
	};

	const handleEventUnpublish = async (id: string) => {
		await unpublishCourse(id);
	};

	const handleEdit = (id: string) => {
		const course = data?.find((c: any) => c.id === id);
		setEditingCourse(course);
		setEditModalOpen(true);
	};

	const handleEditModalCancel = () => {
		setEditModalOpen(false);
		setEditingCourse(null);
	};

	const handleEditModalSubmit = async () => {
		setEditModalOpen(false);
		setEditingCourse(null);
		await refetchMyCourses();

		message.success(t("course.edit.success", "Course edited successfully"));
	};

	const getCourseMenu = (record: any): MenuProps["items"] => {
		const menu: MenuProps["items"] = [];

		if (!screens.md) {
			menu.push({
				key: "edit",
				label: t("course.edit", "Edit"),
				onClick: () => handleEdit(record.id),
			});
		}

		const startOfMenu: MenuProps["items"] = [
			{
				key: "generate-slug",
				label: t("course.generateSlug", "Generate Slug"),
				onClick: () =>
					Modal.confirm({
						title: t(
							"course.generateSlug.confirm",
							"Are you sure you want to generate a slug?",
						),
						content: (
							<Space>
								<Text>
									{t(
										"course.generateSlug.confirm",
										"Old link will no longer be available",
									)}
								</Text>
							</Space>
						),
						onOk: () => generateSlug(record.id),
						onCancel: () => {},
						okText: t("course.generateSlug.confirm", "Generate"),
						cancelText: t("course.generateSlug.cancel", "Cancel"),
					}),
			},
		];

		const endOfMenu: MenuProps["items"] = [
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
								{t("course.delete.confirm", "This action cannot be undone")}
							</Text>
						),
						onOk: () => deleteCourse(record.id),
						onCancel: () => {},
					}),
			},
		];

		const handleCourseUnpublish = async (id: string) => {
			await unpublishCourse(id);
		};

		const handleCourseRestore = async (id: string) => {
			await restoreCourse(id);
		};

		if (record.status === prismaClient.$Enums.CourseStatus.Draft) {
			menu.push(...startOfMenu);
		}

		if (record.status === prismaClient.$Enums.CourseStatus.Published) {
			menu.push(...startOfMenu);
			menu.push({
				key: "unpublish",
				label: t("course.unpublish", "Unpublish"),
				onClick: () => handleCourseUnpublish(record.id),
			});
		}

		if (record.status === prismaClient.$Enums.CourseStatus.Draft) {
			menu.push({
				key: "restore",
				label: t("course.restore", "Restore"),
				onClick: () => handleCourseRestore(record.id),
			});
		}

		menu.push(...endOfMenu);

		return menu;
	};

	const getStatusTag = (
		status: prismaClient.$Enums.CourseStatus,
		record: any,
	) => {
		switch (status) {
			case prismaClient.$Enums.CourseStatus.Draft:
				return <Tag color="default">{t("course.status.draft", "Draft")}</Tag>;
			case prismaClient.$Enums.CourseStatus.Published:
				return (
					<Tag color="success">
						{t("course.status.published", "Published at {publishedAt}", {
							publishedAt: dayjs(record.publishedAt).format("lll"),
						})}
					</Tag>
				);
			case prismaClient.$Enums.CourseStatus.Archived:
				return (
					<Tag color="error">{t("course.status.archived", "Archived")}</Tag>
				);
			default:
				return null;
		}
	};

	const courses = data || [];

	// Build mapping for parent-child relationships
	const courseRelations = React.useMemo(() => {
		const parentToChildren = new Map<string, string[]>();
		const childToParent = new Map<string, string>();

		courses.forEach((course: any) => {
			if (course.parentId) {
				childToParent.set(course.id, course.parentId);
				if (!parentToChildren.has(course.parentId)) {
					parentToChildren.set(course.parentId, []);
				}
				parentToChildren.get(course.parentId)?.push(course.id);
			}
		});

		return { parentToChildren, childToParent };
	}, [courses]);

	const getRelatedCourseIds = (courseId: string): string[] => {
		const related: string[] = [];
		const children = courseRelations.parentToChildren.get(courseId) || [];
		const parent = courseRelations.childToParent.get(courseId);

		if (parent) {
			related.push(parent);
		}
		related.push(...children);

		return related;
	};

	return (
		<ProtectedLayout
			title={t("page.myCourses.title", "My Courses")}
			seo={{ openGraph: { type: "website", url: router.asPath } }}
			extra={<CreateCourseButton onCreation={() => refetchMyCourses()} />}
			showBackButton
			backButtonUrl="/hub/courses"
		>
			<div className={styles.container}>
				{isLoading ? (
					<Flex justify="center" align="center" style={{ minHeight: 200 }}>
						<Space size="large">
							<Card loading style={{ width: 300 }} />
							<Card loading style={{ width: 300 }} />
							<Card loading style={{ width: 300 }} />
						</Space>
					</Flex>
				) : courses.length === 0 ? (
					<Alert
						message={t("course.noCourses", "No courses found")}
						type="info"
						showIcon
					/>
				) : (
					<Row gutter={[16, 16]}>
						{courses.map((course: any) => {
							const schedule = course.schedule || [];
							const hasSchedule = schedule.length > 0;
							const first = hasSchedule ? schedule[0] : null;
							const last = hasSchedule ? schedule[schedule.length - 1] : null;

							const isHovered = hoveredCourseId === course.id;
							const relatedIds = hoveredCourseId
								? getRelatedCourseIds(hoveredCourseId)
								: [];
							const isRelated = hoveredCourseId
								? relatedIds.includes(course.id)
								: false;
							const isHighlighted = isHovered || isRelated;
							const isParent = courseRelations.parentToChildren.has(course.id);
							const isChild = !!course.parentId;

							const cardClassName = [
								isHighlighted
									? isHovered
										? styles.hoveredCard
										: styles.relatedCard
									: undefined,
								isHighlighted && isParent ? styles.parentLabel : undefined,
								isHighlighted && isChild ? styles.childLabel : undefined,
							]
								.filter(Boolean)
								.join(" ");

							return (
								<Col key={course.id} xs={24} sm={12} md={12} lg={8} xl={6}>
									<Card
										className={cardClassName || undefined}
										data-parent-label={t("course.parent", "Parent")}
										data-child-label={t("course.child", "Child")}
										onMouseEnter={() => setHoveredCourseId(course.id)}
										onMouseLeave={() => setHoveredCourseId(null)}
										cover={
											course.image ? (
												<Image
													src={course.image}
													alt={course.title}
													height={200}
													style={{ objectFit: "cover" }}
													preview={false}
												/>
											) : null
										}
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
													href={`${course.lang ? `/${course.lang}` : ""}/courses/${course.slug}`}
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
												menu={{ items: getCourseMenu(course) }}
												trigger={["click"]}
											>
												<Button type="text" block icon={<MoreOutlined />} />
											</Dropdown>,
										]}
									>
										<Card.Meta
											title={
												<Text ellipsis style={{ fontWeight: 400 }}>
													{course.title}
												</Text>
											}
											description={
												<Space
													direction="vertical"
													size="small"
													style={{ width: "100%" }}
												>
													{getStatusTag(course.status, course)}

													<Flex gap={8} wrap="wrap">
														<Tag bordered={false} color="blue">
															{course.lang}
														</Tag>
														<Tag bordered={false}>{course.type}</Tag>
													</Flex>
													{hasSchedule ? (
														<Text>
															{formatEventPeriod(
																first.startDate,
																last.endDate,
																getLanguage(),
															)}
														</Text>
													) : (
														<Alert
															message={t(
																"course.noDates",
																"You need to set a schedule",
															)}
															banner
															type="warning"
															style={{ marginTop: 8 }}
														/>
													)}
													{course.slug && course.publishedAt && (
														<PageViews
															path={`/courses/${course.slug}`}
															startDate={course.publishedAt}
														/>
													)}
												</Space>
											}
										/>
									</Card>
								</Col>
							);
						})}
					</Row>
				)}
				<CourseModal
					open={editModalOpen}
					cours
					eId={editingCourse?.id}
					courseType={editingCourse?.type}
					initialValues={editingCourse}
					onCancel={handleEditModalCancel}
					onSubmit={handleEditModalSubmit}
				/>
			</div>
			{modalContextHolder}
		</ProtectedLayout>
	);
};

export default MyCoursesPage;
