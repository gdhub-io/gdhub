import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { TbClock } from "@react-icons/all-files/tb/TbClock";
import { TbFileText } from "@react-icons/all-files/tb/TbFileText";
import { TbMapPin } from "@react-icons/all-files/tb/TbMapPin";
import { TbQuote } from "@react-icons/all-files/tb/TbQuote";
import { IconCopy } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Col,
	Divider,
	Flex,
	Modal,
	Progress,
	Row,
	Space,
	Spin,
	Tag,
	Typography,
	theme,
} from "antd";
import axios from "axios";
import Link from "next/link";
import { useEffect } from "react";
import styles from "./style.module.scss";

const { Paragraph, Text, Title } = Typography;

const SpecialistPreviewModal = ({
	specialistId,
	open,
	onOk,
	onCancel,
}: any) => {
	const { token } = theme.useToken();
	const { t } = useTranslate();
	const {
		data: specialist,
		refetch: fetchSpecialist,
		isLoading,
	} = useQuery({
		queryKey: ["specialist", specialistId],
		queryFn: () =>
			axios.get<
				prismaClient.Speciality & {
					availableProjects: (prismaClient.MatchingSpecialistAndProject & {
						project: { name: string };
					})[];
					direction: prismaClient.WorkDirection;
					user: prismaClient.User & {
						profile: prismaClient.Profile & { [key: string]: any };
					};
				}
			>("/api/specialist", { params: { id: specialistId } }),
		staleTime: Infinity,
		enabled: open,
	});

	useEffect(() => {
		if (open && specialistId) {
			fetchSpecialist();
		}
	}, [open]);

	const handleCancel = () => {
		onCancel();
	};

	const calculateMatchColor = (percent: number) => {
		if (percent >= 60 && percent < 80) {
			return token.colorWarning;
		}

		if (percent >= 80) {
			return token.colorSuccess;
		}

		return token.colorError;
	};

	const renderSkillTags = (skills: string | null) => {
		if (!skills) return t("specialist.skills.notPointed", "(not pointed)");
		return skills.split(",").map((skill, index) => (
			<Tag key={`skill-${index.toString()}`} className={styles.skillTag}>
				{skill.trim()}
			</Tag>
		));
	};

	return (
		<Modal
			centered
			title={null}
			width={800}
			destroyOnHidden
			maskClosable={false}
			open={open}
			onCancel={handleCancel}
			footer={[
				<Space key="form-buttons" wrap>
					<Button key="close" onClick={handleCancel} disabled={isLoading}>
						{t("specialist.preview.close", "Close")}
					</Button>
				</Space>,
			]}
		>
			<Spin spinning={isLoading}>
				{!!specialist?.data && (
					<Space direction="vertical" style={{ width: "100%" }}>
						<div className={styles.cardHeader}>
							<Text type="secondary" className={styles.cardType}>
								{t("specialist.preview.cardType", "Talent card")}
							</Text>
							<div className={styles.specialityTitle}>
								<Title level={2} style={{ margin: 0 }}>
									{specialist?.data.name}
								</Title>
								<span className={styles.levelBadge}>
									{specialist?.data.level}
								</span>
							</div>
						</div>

						<Row gutter={[24, 24]}>
							<Col xs={24} md={16}>
								<Card className={styles.cardWrapper} variant="borderless">
									<Row gutter={[24, 16]} className={styles.profileInfo}>
										{!!specialist.data.user.profile.country && (
											<Col xs={24} sm={12}>
												<Space>
													<TbMapPin
														size={18}
														style={{ color: token.colorPrimary }}
													/>
													<Text>
														{[
															specialist.data.user.profile.country,
															specialist.data.user.profile.city,
														].join(", ")}
													</Text>
												</Space>
											</Col>
										)}
										<Col xs={24} sm={12}>
											<Space>
												<TbClock
													size={18}
													style={{ color: token.colorPrimary }}
												/>
												<Text>
													{t(
														"fromTo",
														"from {fromDate} to {toDate} hours a week",
														{
															fromDate:
																specialist.data.user.profile.timeForWork[0],
															toDate:
																specialist.data.user.profile.timeForWork[1],
														},
													)}
												</Text>
											</Space>
										</Col>
										{!!specialist.data.portfolioUrl && (
											<Col span={24}>
												<Space>
													<TbFileText
														size={18}
														style={{ color: token.colorPrimary }}
													/>
													<Link
														href={specialist.data.portfolioUrl}
														target="_blank"
													>
														<Button type="text" ghost size="small">
															{t(
																"specialist.preview.summaryPortfolio",
																"Summary/portfolio",
															)}
														</Button>
													</Link>
												</Space>
											</Col>
										)}
									</Row>
								</Card>
							</Col>

							<Col xs={24} md={8}>
								{(specialist.data.user.profile.tgNickname ||
									specialist.data.user.email) && (
									<Card
										className={styles.cardWrapper}
										title={t("specialist.preview.contacts", "Contacts")}
										variant="borderless"
										style={{ height: "100%" }}
									>
										<Flex vertical className={styles.contactButtons}>
											{!!specialist.data.user.profile.tgNickname && (
												<Space direction="vertical" size={0}>
													<Text type="secondary">
														{t("specialist.preview.telegram", "Telegram")}
													</Text>

													<Text
														copyable={{
															icon: (
																<IconCopy
																	size={16}
																	style={{ position: "relative", top: 2 }}
																/>
															),
															text:
																"https://t.me/" +
																specialist.data.user.profile.tgNickname,
														}}
													>
														{`t.me/${specialist.data.user.profile.tgNickname}`}
													</Text>
												</Space>
											)}
											{!specialist.data.user.profile.tgNickname &&
												!!specialist.data.user.email && (
													<Space direction="vertical" size={0}>
														<Text type="secondary">
															{t("specialist.preview.email", "Email")}
														</Text>
														<Text
															copyable={{
																icon: <IconCopy size={16} />,
																text: specialist.data.user.email,
															}}
														>
															{specialist.data.user.email}
														</Text>
													</Space>
												)}
										</Flex>
									</Card>
								)}
							</Col>
						</Row>

						{specialist.data.user.profile.about && (
							<Card
								className={styles.cardWrapper}
								title={t("specialist.preview.aboutMe", "About me")}
								bordered={false}
							>
								<Row>
									<Col span={24}>
										<div className={styles.quoteBlock}>
											<TbQuote
												size={24}
												style={{ color: token.colorPrimary, marginRight: 8 }}
											/>
											<Paragraph>
												{specialist.data.user.profile.about}
											</Paragraph>
										</div>
									</Col>
								</Row>
							</Card>
						)}

						<Card
							className={styles.cardWrapper}
							title={t(
								"specialist.preview.professionalInfo",
								"Professional info",
							)}
							bordered={false}
						>
							<Row gutter={[24, 24]}>
								<Col xs={24} md={12}>
									<div>
										<Text type="secondary" className={styles.fieldLabel}>
											{t("specialist.preview.specialization", "Specialization")}
										</Text>
										<Paragraph>{specialist.data.specialization}</Paragraph>
									</div>

									{specialist.data.tools && (
										<div style={{ marginTop: 16 }}>
											<Text type="secondary" className={styles.fieldLabel}>
												{t(
													"specialist.preview.iUseItInWork",
													"I use it in work",
												)}
											</Text>
											<Paragraph>{specialist.data.tools}</Paragraph>
										</div>
									)}
								</Col>

								<Col xs={24} md={12}>
									{specialist.data.jobs && (
										<div>
											<Text type="secondary" className={styles.fieldLabel}>
												{t("specialist.preview.experience", "Experience")}
											</Text>
											<Paragraph>{specialist.data.jobs}</Paragraph>
										</div>
									)}

									{specialist.data.schools && (
										<div style={{ marginTop: 16 }}>
											<Text type="secondary" className={styles.fieldLabel}>
												{t(
													"specialist.preview.whereIReceivedKnowledge",
													"Where I received knowledge",
												)}
											</Text>
											<Paragraph>{specialist.data.schools}</Paragraph>
										</div>
									)}
								</Col>
							</Row>
							<Row gutter={[24, 24]}>
								<Col span={24}>
									{specialist.data.skills && (
										<div style={{ marginTop: 16 }}>
											<Text type="secondary" className={styles.fieldLabel}>
												{t("specialist.preview.skills", "Skills")}
											</Text>
											<div style={{ marginTop: 4 }}>
												{renderSkillTags(specialist.data.skills)}
											</div>
										</div>
									)}
								</Col>
							</Row>
						</Card>

						{(specialist.data.user.profile.preferredGenres?.length > 0 ||
							specialist.data.user.profile.preferredSettings?.length > 0 ||
							specialist.data.user.profile.preferredLevels?.length > 0) && (
							<Card
								className={styles.cardWrapper}
								title={t(
									"specialist.preview.preferencesInGames",
									"Preferences in games",
								)}
								bordered={false}
							>
								<Row gutter={[24, 24]}>
									{specialist.data.user.profile.preferredGenres?.length > 0 && (
										<Col xs={24} md={8}>
											<Text type="secondary" className={styles.fieldLabel}>
												{t(
													"specialist.preview.iPreferGenres",
													"I prefer genres",
												)}
											</Text>
											<div style={{ marginTop: 4 }}>
												{specialist.data.user.profile.preferredGenres.map(
													(r: any, index: number) => (
														<Tag
															key={`skill-${index.toString()}`}
															className={styles.skillTag}
														>
															{r.name}
														</Tag>
													),
												)}
											</div>
										</Col>
									)}

									{specialist.data.user.profile.preferredSettings?.length >
										0 && (
										<Col xs={24} md={8}>
											<Text type="secondary" className={styles.fieldLabel}>
												{t(
													"specialist.preview.iPreferGameSettings",
													"I prefer game settings",
												)}
											</Text>
											<div style={{ marginTop: 4 }}>
												{specialist.data.user.profile.preferredSettings.map(
													(r: any, index: number) => (
														<Tag
															key={`skill-${index.toString()}`}
															className={styles.skillTag}
														>
															{r.name}
														</Tag>
													),
												)}
											</div>
										</Col>
									)}

									{specialist.data.user.profile.preferredLevels?.length > 0 && (
										<Col xs={24} md={8}>
											<Text type="secondary" className={styles.fieldLabel}>
												{t(
													"specialist.preview.iPreferGamesOfTheFollowingComplexity",
													"I prefer games of the following complexity",
												)}
											</Text>
											<div style={{ marginTop: 4 }}>
												{specialist.data.user.profile.preferredLevels.map(
													(r: any, index: number) => (
														<Tag
															key={`skill-${index.toString()}`}
															className={styles.skillTag}
														>
															{r.name}
														</Tag>
													),
												)}
											</div>
										</Col>
									)}
								</Row>
							</Card>
						)}

						{specialist.data?.availableProjects?.length > 0 &&
							specialist.data.availableProjects.map((record) => (
								<Card
									key={`project-${record.id}`}
									className={styles.cardWrapper}
									bordered={false}
									title={
										<Row
											justify="space-between"
											align="middle"
											style={{ width: "100%" }}
										>
											<Col>
												<Text strong>
													{t("Suitable for the project") +
														" " +
														record.project.name}
												</Text>
											</Col>
											<Col>
												<Tag
													style={{
														padding: "4px 12px",
														borderRadius: "16px",
														color: "white",
														background: calculateMatchColor(record.avgScore),
													}}
												>
													{record.avgScore}%
												</Tag>
											</Col>
										</Row>
									}
								>
									<Space direction="vertical" style={{ width: "100%" }}>
										<Row gutter={16}>
											<Col xs={24} sm={8}>
												<Card className={styles.statCard} bordered={false}>
													<div style={{ textAlign: "center" }}>
														<Progress
															type="circle"
															percent={record.projectScore}
															size={80}
															strokeColor={calculateMatchColor(
																record.projectScore,
															)}
														/>
														<div style={{ marginTop: 12 }}>
															<Text
																type="secondary"
																className={styles.fieldLabel}
															>
																{t(
																	"specialist.preview.complianceWithTheProject",
																	"Compliance with the project",
																)}
															</Text>
														</div>
													</div>
												</Card>
											</Col>
											<Col xs={24} sm={8}>
												<Card className={styles.statCard} bordered={false}>
													<div style={{ textAlign: "center" }}>
														<Progress
															type="circle"
															percent={record.authorScore}
															size={80}
															strokeColor={calculateMatchColor(
																record.authorScore,
															)}
														/>
														<div style={{ marginTop: 12 }}>
															<Text
																type="secondary"
																className={styles.fieldLabel}
															>
																{t(
																	"specialist.preview.complianceWithTheAuthor",
																	"Compliance with the author",
																)}
															</Text>
														</div>
													</div>
												</Card>
											</Col>
											<Col xs={24} sm={8}>
												<Card className={styles.statCard} bordered={false}>
													<div style={{ textAlign: "center" }}>
														<Progress
															type="circle"
															percent={record.teamScore}
															size={80}
															strokeColor={calculateMatchColor(
																record.teamScore,
															)}
														/>
														<div style={{ marginTop: 12 }}>
															<Text
																type="secondary"
																className={styles.fieldLabel}
															>
																{t(
																	"specialist.preview.complianceWithTheTeam",
																	"Compliance with the team",
																)}
															</Text>
														</div>
													</div>
												</Card>
											</Col>
										</Row>

										{record.summary && (
											<div style={{ marginTop: 24 }}>
												<Divider />
												<Text type="secondary" className={styles.fieldLabel}>
													{t("specialist.preview.comment", "Comment")}
												</Text>
												<Paragraph>{record.summary}</Paragraph>
											</div>
										)}
									</Space>
								</Card>
							))}
					</Space>
				)}
			</Spin>
		</Modal>
	);
};

export default SpecialistPreviewModal;
