import { TbBrandTelegram } from "@react-icons/all-files/tb/TbBrandTelegram";
import { TbClock } from "@react-icons/all-files/tb/TbClock";
import { TbFileText } from "@react-icons/all-files/tb/TbFileText";
import { TbMail } from "@react-icons/all-files/tb/TbMail";
import { TbMapPin } from "@react-icons/all-files/tb/TbMapPin";
import { TbQuote } from "@react-icons/all-files/tb/TbQuote";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Col,
	Modal,
	Row,
	Space,
	Spin,
	Tag,
	Typography,
	theme,
} from "antd";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect } from "react";
import styles from "./style.module.scss";

const { Paragraph, Text, Title } = Typography;

interface TeamMemberCardProps {
	memberId: string;
	open: boolean;
	onCancel: () => void;
}

const TeamMemberCard = ({ memberId, open, onCancel }: TeamMemberCardProps) => {
	const { token } = theme.useToken();
	const { t } = useTranslate();

	const {
		data: member,
		refetch: refetchMember,
		isFetching: processing,
	} = useQuery({
		queryKey: ["team-member", memberId],
		queryFn: () =>
			axios.get("/api/user/project/team/member", {
				params: { id: memberId },
			}),
		enabled: !!memberId,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (open && memberId) {
			refetchMember();
		}
	}, [open]);

	const handleCancel = () => {
		onCancel();
	};

	const renderSkillTags = (skills: string | null) => {
		if (!skills)
			return t("component.teamMemberCard.notPointed", "(not pointed)");
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
			classNames={{ content: styles.modalContent }}
			onCancel={handleCancel}
			footer={null}
		>
			<Spin spinning={processing}>
				{!!member && (
					<Space direction="vertical" style={{ width: "100%" }}>
						<div className={styles.cardHeader}>
							<Row gutter={24} align="middle">
								<Col xs={24} md={18}>
									<Row>
										<Col>
											<Text type="secondary" className={styles.cardType}>
												{t(
													"component.teamMemberCard.title",
													"Team Member Card",
												)}
											</Text>
											<div className={styles.specialityTitle}>
												<Title level={2} style={{ margin: 0 }}>
													{member.data.user.name}
												</Title>
												<span className={styles.levelBadge}>
													{member.data.speciality.level}
												</span>
											</div>
										</Col>
									</Row>
									<Row gutter={[24, 24]}>
										<Col xs={24}>
											<Card className={styles.cardWrapper} bordered={false}>
												<Row gutter={[24, 16]} className={styles.profileInfo}>
													{!!member.data.user.profile.country && (
														<Col xs={24} sm={12}>
															<Space>
																<TbMapPin
																	size={18}
																	style={{ color: token.colorPrimary }}
																/>
																<Text>
																	{[
																		member.data.user.profile.country,
																		member.data.user.profile.city,
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
																	"component.teamMemberCard.fromTo",
																	"from {fromDate} to {toDate} hours a week",
																	{
																		fromDate:
																			member.data.user.profile.timeForWork[0],
																		toDate:
																			member.data.user.profile.timeForWork[1],
																	},
																)}
															</Text>
														</Space>
													</Col>
													{!!member.data.speciality.portfolioUrl && (
														<Col span={24}>
															<Space>
																<TbFileText
																	size={18}
																	style={{ color: token.colorPrimary }}
																/>
																<Link
																	href={member.data.speciality.portfolioUrl}
																	target="_blank"
																>
																	<Button type="text" ghost size="small">
																		{t(
																			"component.teamMemberCard.summaryPortfolio",
																			"Summary/portfolio",
																		)}
																	</Button>
																</Link>
															</Space>
														</Col>
													)}
													{!!member.data.user.profile.tgNickname && (
														<Col span={24}>
															<div className={styles.contactItem}>
																<TbBrandTelegram
																	size={18}
																	style={{ color: token.colorPrimary }}
																/>
																<Text
																	copyable={{
																		text: `https://t.me/${member.data.user.profile.tgNickname}`,
																	}}
																>
																	@{member.data.user.profile.tgNickname}
																</Text>
															</div>
														</Col>
													)}
													{!member.data.user.profile.tgNickname &&
														!!member.data.user.email && (
															<Col span={24}>
																<div className={styles.contactItem}>
																	<TbMail
																		size={18}
																		style={{ color: token.colorPrimary }}
																	/>
																	<Text
																		copyable={{ text: member.data.user.email }}
																	>
																		{member.data.user.email}
																	</Text>
																</div>
															</Col>
														)}
												</Row>
											</Card>
										</Col>
									</Row>
								</Col>
								<Col xs={24} md={6}>
									<div className={styles.avatarWrapper}>
										<Image
											src={member.data.user.image || "/images/avatar.png"}
											alt={member.data.user.name}
											width={120}
											height={120}
											className={styles.avatar}
										/>
									</div>
								</Col>
							</Row>
						</div>

						{member.data.user.profile.motivation && (
							<Card
								className={styles.cardWrapper}
								title={t("component.teamMemberCard.aboutMe", "About me")}
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
												{member.data.user.profile.motivation}
											</Paragraph>
										</div>
									</Col>
								</Row>
							</Card>
						)}

						<Card
							className={styles.cardWrapper}
							title={t(
								"component.teamMemberCard.professionalInfo",
								"Professional info",
							)}
							bordered={false}
						>
							<Row gutter={[24, 24]}>
								<Col xs={24} md={12}>
									<div>
										<Text type="secondary" className={styles.fieldLabel}>
											{t(
												"component.teamMemberCard.specialization",
												"Specialization",
											)}
										</Text>
										<Paragraph>
											{member.data.speciality.specialization}
										</Paragraph>
									</div>

									{member.data.speciality.tools && (
										<div style={{ marginTop: 16 }}>
											<Text type="secondary" className={styles.fieldLabel}>
												{t(
													"component.teamMemberCard.iUseItInWork",
													"I use it in work",
												)}
											</Text>
											<Paragraph>{member.data.speciality.tools}</Paragraph>
										</div>
									)}
								</Col>

								<Col xs={24} md={12}>
									{member.data.speciality.jobs && (
										<div>
											<Text type="secondary" className={styles.fieldLabel}>
												{t("component.teamMemberCard.experience", "Experience")}
											</Text>
											<Paragraph>{member.data.speciality.jobs}</Paragraph>
										</div>
									)}

									{member.data.speciality.schools && (
										<div style={{ marginTop: 16 }}>
											<Text type="secondary" className={styles.fieldLabel}>
												{t(
													"component.teamMemberCard.whereIReceivedKnowledge",
													"Where I received knowledge",
												)}
											</Text>
											<Paragraph>{member.data.speciality.schools}</Paragraph>
										</div>
									)}
								</Col>
							</Row>
							<Row gutter={[24, 24]}>
								<Col span={24}>
									{member.data.speciality.skills && (
										<div style={{ marginTop: 16 }}>
											<Text type="secondary" className={styles.fieldLabel}>
												{t("component.teamMemberCard.skills", "Skills")}
											</Text>
											<div style={{ marginTop: 4 }}>
												{renderSkillTags(member.data.speciality.skills)}
											</div>
										</div>
									)}
								</Col>
							</Row>
						</Card>
					</Space>
				)}
			</Spin>
		</Modal>
	);
};

export default TeamMemberCard;
