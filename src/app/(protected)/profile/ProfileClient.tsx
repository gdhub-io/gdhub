"use client";

import {
	QuestionCircleOutlined,
	TrophyOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { IconTool } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Button,
	Card,
	Col,
	Divider,
	Flex,
	Row,
	Space,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { SkillCapitalIcon } from "@/components/profile/SkillCapitalIcon";

type SkillCapitalResponse = {
	scTotal: number;
	leadershipCapital: number;
	executionCapital: number;
	mentorshipCapital: number;
	investorCapital: number | null;
};

const { Title, Text, Paragraph } = Typography;
const numberFormatter = new Intl.NumberFormat();

const formatNumber = (value: number) => numberFormatter.format(value);

const StatTile = ({
	label,
	value,
	disabled,
	icon,
	helpText,
}: {
	label: string;
	value: string | number;
	disabled?: boolean;
	icon: React.ReactNode;
	helpText: string;
}) => (
	<Flex
		vertical
		align="center"
		justify="center"
		gap={6}
		style={{
			padding: "10px 8px",
			minHeight: 104,
			borderRadius: 12,
			background: disabled ? "#f8fafc" : "#ffffff",
			border: "1px solid #eef2f7",
			height: "100%",
		}}
	>
		<Space align="center" size={6}>
			{icon}
			<Title
				level={3}
				style={{ margin: 0, color: disabled ? "#94a3b8" : "#111827" }}
			>
				{value}
			</Title>
		</Space>
		<Space size={4} align="center">
			<Text style={{ color: disabled ? "#94a3b8" : "#6b7280" }}>{label}</Text>
			<Tooltip title={helpText}>
				<QuestionCircleOutlined
					style={{ color: disabled ? "#94a3b8" : "#9ca3af" }}
				/>
			</Tooltip>
		</Space>
		{disabled ? (
			<Tag color="default" style={{ marginTop: 2 }}>
				in development
			</Tag>
		) : null}
	</Flex>
);

const ProfileClient = () => {
	const { t } = useTranslate();
	const { data: session } = useSession();

	const { data: skillCapital, isLoading: skillCapitalLoading } = useQuery({
		queryKey: ["profile-preview-skill-capital", session?.user?.id],
		queryFn: () =>
			axios
				.get<SkillCapitalResponse>("/api/user/skill-capital")
				.then((r) => r.data),
		enabled: !!session?.user?.id,
	});

	return (
		<div className="layout-background">
			<ProtectedPageHeader
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
			/>
			<Row justify="center" gutter={[0, 20]}>
				<Col xs={24} md={20} lg={14} xl={12}>
					<Flex
						align="center"
						justify="space-between"
						style={{ marginBottom: 10 }}
					>
						<Space size={10} align="center">
							<Avatar src={session?.user?.image || undefined} size={48} />
							<Space orientation="vertical" size={0}>
								<Text strong style={{ fontSize: 17, lineHeight: "22px" }}>
									{session?.user?.name || "User"}
								</Text>
								<Text type="secondary">{session?.user?.email || "—"}</Text>
							</Space>
						</Space>
					</Flex>

					<Card
						loading={skillCapitalLoading}
						bordered={false}
						style={{
							borderRadius: 22,
							border: "1px solid #eef2f7",
							background:
								"radial-gradient(circle at 20% 20%, #f6f9ff 0%, #ffffff 45%), radial-gradient(circle at 80% 70%, #fff7ed 0%, #ffffff 50%)",
						}}
					>
						<Flex vertical align="center" gap={8} style={{ paddingTop: 10 }}>
							<SkillCapitalIcon size={92} />
							<Title
								level={1}
								style={{ margin: 0, fontSize: 88, lineHeight: 1 }}
							>
								{formatNumber(skillCapital?.scTotal ?? 0)}
							</Title>
							<Text style={{ fontSize: 18, fontWeight: 500 }}>
								Skill Capital
							</Text>
							<Tooltip
								title={t(
									"profile.page.skillCapital.help.sc",
									"Total of Leadership, Execution, and Mentorship capital.",
								)}
							>
								<Text type="secondary" style={{ textAlign: "center" }}>
									<QuestionCircleOutlined style={{ marginRight: 6 }} />
									{t(
										"profile.page.skillCapital.note",
										"Metrics are calculated from your project activity and will evolve.",
									)}
								</Text>
							</Tooltip>
						</Flex>

						<Divider style={{ margin: "18px 0" }} />

						<Card
							size="small"
							bordered={false}
							style={{
								borderRadius: 16,
								background: "#f8fafc",
								border: "1px solid #eef2f7",
							}}
							title={
								<Flex justify="center">
									<Text strong>Your Statistics</Text>
								</Flex>
							}
						>
							<Row gutter={[8, 8]}>
								<Col span={12}>
									<StatTile
										label={t("profile.page.skillCapital.lc", "Leadership")}
										value={formatNumber(skillCapital?.leadershipCapital ?? 0)}
										icon={<TrophyOutlined style={{ color: "#f59e0b" }} />}
										helpText={t(
											"profile.page.skillCapital.help.lc",
											"Leadership Capital from projects where you are the author.",
										)}
									/>
								</Col>
								<Col span={12}>
									<StatTile
										label={t("profile.page.skillCapital.ec", "Execution")}
										value={formatNumber(skillCapital?.executionCapital ?? 0)}
										icon={<TrophyOutlined style={{ color: "#22c55e" }} />}
										helpText={t(
											"profile.page.skillCapital.help.ec",
											"Execution Capital from your work as a team member.",
										)}
									/>
								</Col>
								<Col span={12}>
									<StatTile
										label={t("profile.page.skillCapital.mc", "Mentorship")}
										value={formatNumber(skillCapital?.mentorshipCapital ?? 0)}
										icon={<TrophyOutlined style={{ color: "#3b82f6" }} />}
										helpText={t(
											"profile.page.skillCapital.help.mc",
											"Mentorship Capital from completed advisory sessions.",
										)}
									/>
								</Col>
								<Col span={12}>
									<StatTile
										label="Investor"
										value="--"
										disabled
										icon={<UserOutlined style={{ color: "#9ca3af" }} />}
										helpText="Investor Capital will be added in future releases."
									/>
								</Col>
							</Row>
						</Card>

						<Paragraph
							style={{
								marginTop: 16,
								marginBottom: 0,
								fontSize: 15,
								color: "#374151",
							}}
						>
							Your Skill Capital reflects your leadership, execution, and
							mentorship contribution in projects.
						</Paragraph>
					</Card>
				</Col>
			</Row>
		</div>
	);
};

export default ProfileClient;
