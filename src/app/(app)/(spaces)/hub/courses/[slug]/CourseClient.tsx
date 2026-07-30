"use client";

import type {
	Course,
	CourseCurriculum,
	CourseGroup,
	CourseGroupSchedule,
	CourseLesson,
	User,
	WorkDirection,
} from "@gdhub-io/gdhub-prisma";
import {
	IconActivity,
	IconBookmark,
	IconCertificate,
	IconClock,
	IconLanguage,
	IconMessageCircle,
	IconPaperclip,
	IconPlus,
	IconSchool,
	IconStarFilled,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Button,
	Col,
	Collapse,
	Flex,
	Row,
	Skeleton,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import styles from "./course.module.scss";

const { Title, Paragraph, Text } = Typography;

type TeacherSummary = Pick<User, "id" | "name" | "image">;

type CourseDetail = Course & {
	direction: Pick<WorkDirection, "id" | "name">;
	createdByUser: TeacherSummary;
	curriculums: (Pick<
		CourseCurriculum,
		"id" | "name" | "description" | "price"
	> & {
		lessons: (Pick<
			CourseLesson,
			"id" | "name" | "description" | "order" | "ectsInClass" | "ectsHomework"
		> & {
			teacher: TeacherSummary | null;
		})[];
	})[];
	groups: (Pick<CourseGroup, "id" | "name"> & {
		curriculum: Pick<CourseCurriculum, "id" | "price">;
		schedule: Pick<CourseGroupSchedule, "date">[];
	})[];
};

const directionBgClass = (name?: string) =>
	name
		? `bg-direc-${name.replace(" & ", "-").replace(/\s+/g, "-")}`
		: "bg-direc-default";

const CourseClient = () => {
	const { t } = useTranslate();
	const params = useParams<{ slug: string }>();
	const slug = params?.slug;

	const { data, isLoading, isError } = useQuery({
		queryKey: ["course", slug],
		queryFn: () =>
			axios.get<CourseDetail>(`/api/courses/${slug}`).then((res) => res.data),
		enabled: typeof slug === "string" && slug.length > 0,
		refetchOnWindowFocus: false,
	});

	const curriculum = data?.curriculums?.[0];
	const group = data?.groups?.[0];

	const startDate = group?.schedule?.[0]?.date;
	const lessonsCount = curriculum?.lessons?.length ?? 0;

	const totalDurationHours = useMemo(() => {
		if (!curriculum?.lessons?.length) return null;
		const totalEcts = curriculum.lessons.reduce(
			(acc, l) => acc + (l.ectsInClass ?? 0),
			0,
		);
		return totalEcts > 0 ? totalEcts : null;
	}, [curriculum]);

	const price = group?.curriculum?.price ?? curriculum?.price;

	const teachers = useMemo<TeacherSummary[]>(() => {
		if (!data) return [];
		const seen = new Map<string, TeacherSummary>();
		const push = (user: TeacherSummary | null | undefined) => {
			if (user?.id && !seen.has(user.id)) seen.set(user.id, user);
		};
		push(data.createdByUser);
		for (const c of data.curriculums ?? []) {
			for (const l of c.lessons ?? []) push(l.teacher);
		}
		return Array.from(seen.values());
	}, [data]);

	const tocItems = (curriculum?.lessons ?? []).map((lesson) => ({
		key: lesson.id,
		label: <Text strong>{lesson.name}</Text>,
		children: lesson.description ? (
			<Paragraph
				type="secondary"
				style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}
			>
				{lesson.description}
			</Paragraph>
		) : (
			<Text type="secondary">
				{t("course.lesson.noDescription", "No description provided.")}
			</Text>
		),
	}));

	const breadcrumbs = data
		? [
				{
					title: (
						<Link href="/hub/courses">{t("hub.menu.courses", "Courses")}</Link>
					),
				},
				{ title: data.direction?.name },
				{ title: data.name },
			]
		: undefined;

	if (isLoading) {
		return (
			<div className="layout-background">
				<div className={styles.container}>
					<Skeleton active paragraph={{ rows: 8 }} />
				</div>
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="layout-background">
				<ProtectedPageHeader
					title={t("course.notFound.title", "Course not found")}
				/>
				<div className={styles.container}>
					<Paragraph>
						{t(
							"course.notFound.description",
							"This course doesn't exist or is no longer available.",
						)}
					</Paragraph>
					<Link href="/hub/courses">
						<Button>{t("course.backToCourses", "Back to courses")}</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="layout-background">
			<ProtectedPageHeader breadcrumbs={breadcrumbs} />
			<div className={styles.container}>
				<Row gutter={[32, 32]} align="top">
					<Col xs={24} lg={15}>
						<div
							className={[
								styles.hero,
								directionBgClass(data.direction?.name),
							].join(" ")}
						>
							{data.image ? (
								<Image
									src={data.image}
									alt={data.name}
									fill
									sizes="(max-width: 992px) 100vw, 60vw"
									style={{ objectFit: "cover" }}
									priority
								/>
							) : null}

							{/* <div className={styles.reviewsBadge}>
								<IconStarFilled size={14} color="#F5A524" />
								<Text strong style={{ fontSize: 13 }}>
									4.8
								</Text>
								<Text type="secondary" style={{ fontSize: 12 }}>
									1,421 {t("course.reviews", "reviews")}
								</Text>
							</div> */}
						</div>

						{teachers.length > 0 ? (
							<div className={styles.authorRow}>
								{teachers.length > 1 ? (
									<Avatar.Group
										size="small"
										max={{
											count: 3,
											style: {
												color: "#FFFFFF",
												backgroundColor: "#fff",
												fontSize: 10,
											},
										}}
										className={styles.authorAvatarGroup}
									>
										{teachers.map((tch) => (
											<Avatar
												key={tch.id}
												src={tch.image ?? undefined}
												style={{ backgroundColor: "#fff" }}
											>
												{tch.name?.[0]}
											</Avatar>
										))}
									</Avatar.Group>
								) : null}
								<Text type="secondary">
									{t("course.authorPrefix", "A course by")}
								</Text>
								<Text strong>{teachers.map((tch) => tch.name).join(", ")}</Text>
							</div>
						) : null}

						<Title level={1} className={styles.title}>
							{data.name}
						</Title>

						{data.shortLine ? (
							<Paragraph className={styles.shortLine}>
								{data.shortLine}
							</Paragraph>
						) : null}

						{data.description ? (
							<Paragraph className={styles.description}>
								{data.description}
							</Paragraph>
						) : null}

						{teachers.length > 0 ? (
							<div className={styles.teachersBlock}>
								<Text className={styles.sectionLabel}>
									{t("course.teachers.label", "Teachers")}
								</Text>
								<div className={styles.teachersList}>
									{teachers.map((tch) => (
										<div key={tch.id} className={styles.teacherCard}>
											<Avatar
												shape="square"
												size={48}
												src={tch.image ?? undefined}
												style={{
													backgroundColor: "rgb(0, 0, 0, 0.2)",
													borderRadius: 10,
													flexShrink: 0,
												}}
											>
												{tch.name?.[0]}
											</Avatar>
											<div className={styles.teacherInfo}>
												<Text className={styles.teacherName}>{tch.name}</Text>
											</div>
										</div>
									))}
								</div>
							</div>
						) : null}

						{tocItems.length > 0 ? (
							<div className={styles.tocSection}>
								<Text className={styles.sectionLabel}>
									{t("course.toc", "Course table of contents")}
								</Text>
								<Collapse
									items={tocItems}
									defaultActiveKey={tocItems[0]?.key ? [tocItems[0].key] : []}
									className={styles.toc}
									expandIconPosition="end"
									expandIcon={({ isActive }) =>
										isActive ? (
											<IconX size={18} stroke={1.5} color="#71717A" />
										) : (
											<IconPlus size={18} stroke={1.5} color="#71717A" />
										)
									}
									bordered
								/>
							</div>
						) : null}
					</Col>

					<Col xs={24} lg={9}>
						<div className={styles.sidebar}>
							<Flex align="baseline" gap={8} justify="flex-end">
								<Title level={2} className={styles.price}>
									{price != null
										? Number(price).toFixed(2)
										: t("course.priceFree", "Free")}
								</Title>
								{price != null ? <Text type="secondary">EUR</Text> : null}
							</Flex>

							<Row gutter={12} className={styles.metaRow}>
								<Col span={12}>
									<div className={styles.metaCard}>
										<IconBookmark size={18} stroke={1.5} />
										<div>
											<Text className={styles.metaLabel}>
												{t("course.meta.lessons", "Lessons")}
											</Text>
											<Text className={styles.metaValue}>
												{lessonsCount || "—"}
											</Text>
										</div>
									</div>
								</Col>
								<Col span={12}>
									<div className={styles.metaCard}>
										<IconActivity size={18} stroke={1.5} />
										<div>
											<Text className={styles.metaLabel}>
												{t("course.meta.difficulty", "Difficulty")}
											</Text>
											<Text className={styles.metaValue}>
												{t("course.difficulty.advanced", "Advanced")}
											</Text>
										</div>
									</div>
								</Col>
							</Row>

							<div className={styles.infoList}>
								{startDate ? (
									<InfoRow
										icon={<IconClock size={16} stroke={1.5} />}
										label={t("course.meta.startsAt", "Starts at")}
										value={dayjs(startDate).format("ll")}
									/>
								) : null}
								{/* <InfoRow
									icon={<IconUsers size={16} stroke={1.5} />}
									label={t("course.meta.students", "Students")}
									value="3,215"
								/> */}
								<InfoRow
									icon={<IconLanguage size={16} stroke={1.5} />}
									label={t("course.meta.language", "Language")}
									value={
										data.language === "ru"
											? t("course.language.ru", "Russian")
											: t("course.language.en", "English")
									}
								/>
								{/* {totalDurationHours ? (
									<InfoRow
										icon={<IconClock size={16} stroke={1.5} />}
										label={t("course.meta.duration", "Duration")}
										value={`${totalDurationHours}h`}
									/>
								) : null} */}
								{/* <InfoRow
									icon={<IconPaperclip size={16} stroke={1.5} />}
									label={t("course.meta.resources", "Additional resources")}
									value={t("course.meta.resourcesValue", "12 files")}
								/> */}
								{/* <InfoRow
									icon={<IconMessageCircle size={16} stroke={1.5} />}
									label={t("course.meta.critique", "Critique session")}
									value={t(
										"course.meta.critiqueValue",
										"Individual recordings",
									)}
								/> */}
								<InfoRow
									icon={<IconCertificate size={16} stroke={1.5} />}
									label={t("course.meta.certificate", "Certificate")}
									value={t(
										"course.meta.certificateValue",
										"Upon completion of the course",
									)}
								/>
							</div>

							<Button
								type="primary"
								size="large"
								block
								className={["black-btn", styles.enrollBtn].join(" ")}
								icon={<IconSchool size={16} stroke={1.5} />}
							>
								{t("course.enroll", "Enroll a course")}
							</Button>

							<div className={styles.sidebarSections}>
								<SidebarSection
									label={t("course.sidebar.assignment", "Assignment")}
									body={t(
										"course.sidebar.assignmentBody",
										"Plan to dedicate a minimum of 1–2 hours per day to watch lecture videos, engage in Q&A sessions, and complete assignments.",
									)}
								/>
								<SidebarSection
									label={t("course.sidebar.prerequisites", "Prerequisites")}
									body={t(
										"course.sidebar.prerequisitesBody",
										"Familiarity with the chosen tool's interface and basic concepts. Understanding of fundamental theory related to the topic is recommended.",
									)}
								/>
								<SidebarSection
									label={t("course.sidebar.materials", "Materials")}
									body={t(
										"course.sidebar.materialsBody",
										"Recommended hardware and software for participation will be provided in the welcome materials after enrollment.",
									)}
								/>
							</div>
						</div>
					</Col>
				</Row>
			</div>
		</div>
	);
};

const InfoRow = ({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: React.ReactNode;
}) => (
	<Flex gap={10} align="flex-start" className={styles.infoRow}>
		<span className={styles.infoIcon}>{icon}</span>
		<Flex gap={6} wrap="wrap">
			<Text type="secondary">{label}:</Text>
			<Text strong>{value}</Text>
		</Flex>
	</Flex>
);

const SidebarSection = ({ label, body }: { label: string; body: string }) => (
	<div className={styles.sidebarSection}>
		<Text className={styles.sectionLabel}>{label}</Text>
		<Paragraph className={styles.sidebarBody}>{body}</Paragraph>
	</div>
);

export default CourseClient;
