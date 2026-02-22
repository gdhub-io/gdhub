"use client";

import { QuestionCircleOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IconTool } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Button,
	Card,
	Col,
	Descriptions,
	Flex,
	List,
	Row,
	Space,
	Statistic,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";

type ProfileResponse = prismaClient.Profile & {
	user: Partial<prismaClient.User>;
};

type SkillCapitalResponse = {
	sc: number;
	pcsTotal: number;
	ri: number;
	sds: { value: number; total: number };
	projects: {
		active: {
			id: string;
			name: string;
			status: prismaClient.ProjectStatus;
			currentStepName?: string | null;
			roles: string[];
			pcs: number;
		}[];
		history: {
			id: string;
			name: string;
			status: prismaClient.ProjectStatus;
			currentStepName?: string | null;
			roles: string[];
			pcs: number;
		}[];
	};
};

const { Title, Text, Paragraph } = Typography;

const statusColorMap: Record<prismaClient.ProjectStatus, string> = {
	[prismaClient.ProjectStatus.Registered]: "default",
	[prismaClient.ProjectStatus.Approved]: "processing",
	[prismaClient.ProjectStatus.Rejected]: "error",
	[prismaClient.ProjectStatus.Dormant]: "warning",
	[prismaClient.ProjectStatus.Archived]: "default",
	[prismaClient.ProjectStatus.Released]: "success",
	[prismaClient.ProjectStatus.KilledWithDignity]: "purple",
};

const ProfilePage: NextPageWithLayout = () => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const { data: profile, isLoading: profileLoading } = useQuery({
		queryKey: ["profile-preview", session?.user?.id],
		queryFn: () =>
			axios.get<ProfileResponse>("/api/user/profile").then((r) => r.data),
		enabled: !!session?.user?.id,
	});
	const { data: specialities, isLoading: specialitiesLoading } = useQuery({
		queryKey: ["profile-preview-specialities", session?.user?.id],
		queryFn: () =>
			axios
				.get<
					(prismaClient.Speciality & {
						direction: prismaClient.WorkDirection;
					})[]
				>("/api/user/specialities")
				.then((r) => r.data),
		enabled: !!session?.user?.id,
	});
	const { data: skillCapital, isLoading: skillCapitalLoading } = useQuery({
		queryKey: ["profile-preview-skill-capital", session?.user?.id],
		queryFn: () =>
			axios
				.get<SkillCapitalResponse>("/api/user/skill-capital")
				.then((r) => r.data),
		enabled: !!session?.user?.id,
	});

	const location = [profile?.country, profile?.city].filter(Boolean).join(", ");
	const timeForWork =
		profile?.timeForWork?.length === 2
			? `${profile.timeForWork[0]}-${profile.timeForWork[1]}`
			: null;
	const tgNickname = profile?.tgNickname
		? profile.tgNickname.replace("@", "")
		: null;
	const roles = session?.user?.roles || [];
	const primaryInterest = profile?.primaryInterest;

	return (
		<ProtectedLayout
			title={t("profile.page.title", "My profile")}
			extra={
				<Space>
					<Tag
						color="orange"
						icon={
							<IconTool
								size={16}
								style={{ position: "relative", top: 3, marginRight: 4 }}
							/>
						}
					>
						This page is in development
					</Tag>
					<Link href="/profile/settings/general">
						<Button type="primary">
							{t("profile.page.actions.settings", "Settings")}
						</Button>
					</Link>
				</Space>
			}
		>
			<Row gutter={[24, 24]} align="stretch">
				<Col xs={24} lg={8} style={{ display: "flex" }}>
					<Card
						loading={profileLoading}
						bordered={false}
						style={{ width: "100%" }}
						styles={{ body: { height: "100%" } }}
					>
						<Space size={16} align="center">
							<Avatar size={64} src={session?.user?.image || undefined} />
							<div>
								<Title level={3} style={{ marginBottom: 4 }}>
									{profile?.name || session?.user?.name}
								</Title>
								<Text type="secondary">{session?.user?.email}</Text>
								<Space size={6} wrap style={{ marginTop: 8 }}>
									{primaryInterest ? <Tag>{primaryInterest}</Tag> : null}
									{roles.map((role) => (
										<Tag key={role}>{role}</Tag>
									))}
								</Space>
							</div>
						</Space>
						<Descriptions
							column={1}
							size="small"
							style={{ marginTop: 16 }}
							items={[
								{
									key: "location",
									label: t("profile.page.location", "Location"),
									children:
										location || t("profile.page.empty", "Not specified"),
								},
								{
									key: "availability",
									label: t("profile.page.availability", "Availability"),
									children: timeForWork
										? t(
												"profile.page.availability.value",
												"{fromTo} hours/week",
												{ fromTo: timeForWork },
											)
										: t("profile.page.empty", "Not specified"),
								},
								{
									key: "tg",
									label: t("profile.page.telegram", "Telegram"),
									children: tgNickname ? (
										<Link href={`https://t.me/${tgNickname}`} target="_blank">
											@{tgNickname}
										</Link>
									) : (
										t("profile.page.empty", "Not specified")
									),
								},
							]}
						/>
					</Card>
				</Col>
				<Col xs={24} lg={16} style={{ display: "flex" }}>
					<Card
						title={t("profile.page.skillCapital.title", "Skill Capital")}
						loading={skillCapitalLoading}
						bordered={false}
						style={{ width: "100%" }}
						styles={{ body: { height: "100%" } }}
					>
						<Text type="secondary">
							{t(
								"profile.page.skillCapital.note",
								"Metrics are calculated from your project activity and will evolve.",
							)}
						</Text>
						<Row gutter={[24, 24]} style={{ marginTop: 16 }}>
							<Col xs={24} md={8}>
								<Card
									bordered={false}
									style={{
										background:
											"linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)",
									}}
								>
									<Statistic
										title={
											<Space size={6}>
												{t("profile.page.skillCapital.sc", "SC")}
												<Tooltip
													title={t(
														"profile.page.skillCapital.help.sc",
														"Total Skill Capital from your project participation.",
													)}
												>
													<QuestionCircleOutlined />
												</Tooltip>
											</Space>
										}
										value={skillCapital?.sc ?? 0}
										valueStyle={{ fontSize: 32 }}
									/>
								</Card>
							</Col>
							<Col xs={24} md={16}>
								<Row gutter={[16, 16]}>
									<Col xs={24} sm={12} md={12}>
										<Statistic
											title={
												<Space size={6}>
													{t("profile.page.skillCapital.pcs", "PCS")}
													<Tooltip
														title={t(
															"profile.page.skillCapital.help.pcs",
															"Project Commitment Score based on time, entry stage, and project outcome.",
														)}
													>
														<QuestionCircleOutlined />
													</Tooltip>
												</Space>
											}
											value={skillCapital?.pcsTotal ?? 0}
										/>
									</Col>
									<Col xs={24} sm={12} md={12}>
										<Statistic
											title={
												<Space size={6}>
													{t("profile.page.skillCapital.ri", "RI")}
													<Tooltip
														title={t(
															"profile.page.skillCapital.help.ri",
															"Retention index: released projects vs started projects.",
														)}
													>
														<QuestionCircleOutlined />
													</Tooltip>
												</Space>
											}
											value={skillCapital?.ri ?? 0}
										/>
									</Col>
									<Col xs={24} sm={12} md={12}>
										<Statistic
											title={
												<Space size={6}>
													{t("profile.page.skillCapital.sds", "SDS")}
													<Tooltip
														title={t(
															"profile.page.skillCapital.help.sds",
															"Stage depth: how many project stages you touched.",
														)}
													>
														<QuestionCircleOutlined />
													</Tooltip>
												</Space>
											}
											value={
												skillCapital
													? `${skillCapital.sds.value}/${skillCapital.sds.total}`
													: "0/0"
											}
										/>
									</Col>
								</Row>
							</Col>
						</Row>
					</Card>
				</Col>

				<Col xs={24}>
					<Card bordered={false}>
						<Row gutter={[24, 24]}>
							<Col xs={24} md={12}>
								<Title level={5}>
									{t(
										"profile.page.skillCapital.activeProjects",
										"Active Projects",
									)}
								</Title>
								<List
									grid={{ gutter: 16, xs: 1, sm: 2, md: 2 }}
									dataSource={skillCapital?.projects.active || []}
									locale={{
										emptyText: t(
											"profile.page.skillCapital.activeProjects.empty",
											"No active projects",
										),
									}}
									renderItem={(project) => (
										<List.Item>
											<Card size="small">
												<Flex justify="space-between" align="center">
													<Space direction="vertical" size={2}>
														<Text strong>{project.name}</Text>
														{project.currentStepName && (
															<Text type="secondary">
																{project.currentStepName}
															</Text>
														)}
														{project.roles?.length ? (
															<Space size={4} wrap>
																{project.roles.map((role) => (
																	<Tag key={`${project.id}-${role}`}>
																		{role}
																	</Tag>
																))}
															</Space>
														) : (
															<Tag>
																{t(
																	"profile.page.skillCapital.role",
																	"Participant",
																)}
															</Tag>
														)}
													</Space>
													<Tag color={statusColorMap[project.status]}>
														{project.status}
													</Tag>
												</Flex>
											</Card>
										</List.Item>
									)}
								/>
							</Col>
							<Col xs={24} md={12}>
								<Title level={5}>
									{t("profile.page.skillCapital.history", "Project History")}
								</Title>
								<List
									dataSource={skillCapital?.projects.history || []}
									locale={{
										emptyText: t(
											"profile.page.skillCapital.history.empty",
											"No project history",
										),
									}}
									renderItem={(project) => (
										<List.Item>
											<Flex justify="space-between" style={{ width: "100%" }}>
												<Space direction="vertical" size={2}>
													<Text strong>{project.name}</Text>
													{project.currentStepName && (
														<Text type="secondary">
															{project.currentStepName}
														</Text>
													)}
													{project.roles?.length ? (
														<Space size={4} wrap>
															{project.roles.map((role) => (
																<Tag key={`${project.id}-${role}`}>{role}</Tag>
															))}
														</Space>
													) : (
														<Tag>
															{t(
																"profile.page.skillCapital.role",
																"Participant",
															)}
														</Tag>
													)}
												</Space>
												<Tag color={statusColorMap[project.status]}>
													{project.status}
												</Tag>
											</Flex>
										</List.Item>
									)}
								/>
							</Col>
						</Row>
					</Card>
				</Col>

				<Col xs={24}>
					<Card
						title={t("profile.page.bio.title", "Bio")}
						loading={profileLoading}
						bordered={false}
					>
						<Paragraph>
							{profile?.motivation || t("profile.page.empty", "Not specified")}
						</Paragraph>
					</Card>
				</Col>

				<Col xs={24}>
					<Card
						title={t("profile.page.specialities.title", "Specialities")}
						loading={specialitiesLoading}
						bordered={false}
					>
						<List
							dataSource={specialities || []}
							locale={{
								emptyText: t(
									"profile.page.specialities.empty",
									"No specialities yet",
								),
							}}
							renderItem={(speciality) => (
								<List.Item>
									<Space direction="vertical" size={4}>
										<Space>
											<Text strong>{speciality.name}</Text>
											<Tag>{speciality.level}</Tag>
											{speciality.direction?.name && (
												<Tag color="geekblue">{speciality.direction.name}</Tag>
											)}
										</Space>
										{speciality.specialization && (
											<Text type="secondary">{speciality.specialization}</Text>
										)}
										{speciality.portfolioUrl && (
											<Link href={speciality.portfolioUrl} target="_blank">
												{t("profile.page.specialities.portfolio", "Portfolio")}
											</Link>
										)}
									</Space>
								</List.Item>
							)}
						/>
					</Card>
				</Col>
			</Row>
		</ProtectedLayout>
	);
};

export default ProfilePage;
