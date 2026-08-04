import {
	IconCalendarEvent,
	IconExternalLink,
	IconFileText,
	IconFolder,
	IconUser,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Avatar, Button, Card, Col, Flex, Row, Space, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import type { VerifyCertificateResponse } from "@/app/api/verify/_helpers";
import styles from "./style.module.scss";

const { Text, Title, Paragraph } = Typography;

type VerifyResultProps = {
	data: VerifyCertificateResponse;
};

const formatDate = (iso: string | null) =>
	iso ? dayjs(iso).format("MMM D, YYYY") : "—";

const initials = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("") || "?";

const SectionLabel = ({
	icon,
	children,
}: {
	icon: React.ReactNode;
	children: React.ReactNode;
}) => (
	<Space size={6}>
		{icon}
		<Text
			type="secondary"
			style={{
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: 0.6,
				textTransform: "uppercase",
			}}
		>
			{children}
		</Text>
	</Space>
);

const MetaItem = ({
	label,
	value,
}: {
	label: React.ReactNode;
	value: React.ReactNode;
}) => (
	<Flex vertical gap={4}>
		<Text type="secondary" style={{ fontSize: 12 }}>
			{label}
		</Text>
		<Text strong style={{ fontSize: 14 }}>
			{value}
		</Text>
	</Flex>
);

export const VerifyResult = ({ data }: VerifyResultProps) => {
	const { t } = useTranslate();

	const fileName = `${data.number}.pdf`;
	const pdfUrl = `/api/verify/${encodeURIComponent(data.number)}/pdf#view=FitH&pagemode=none&zoom=page-width`;

	const cardBody = { padding: 24 } as const;

	return (
		<Row gutter={[20, 20]} style={{ width: "100%" }}>
			<Col xs={24} lg={10}>
				<Flex vertical gap={16}>
					<Card styles={{ body: cardBody }}>
						<Flex vertical gap={16}>
							<SectionLabel
								icon={
									<IconUser size={14} color="var(--gd-color-text-tertiary)" />
								}
							>
								{t("verify.result.recipient", "Recipient")}
							</SectionLabel>
							<Flex gap={14} align="center">
								<Avatar
									size={56}
									src={data.participant.image ?? undefined}
									style={{
										flex: "0 0 56px",
										background: data.participant.image ? undefined : "#d4a574",
										fontSize: 22,
										fontWeight: 700,
									}}
								>
									{initials(data.participant.name)}
								</Avatar>
								<Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
									<Title level={4} style={{ margin: 0, fontWeight: 700 }}>
										{data.participant.name}
									</Title>
									{data.participant.specialty && (
										<Text type="secondary">{data.participant.specialty}</Text>
									)}
								</Flex>
							</Flex>
						</Flex>
					</Card>

					{data.project && (
						<Card styles={{ body: cardBody }}>
							<Flex vertical gap={16}>
								<SectionLabel
									icon={
										<IconFolder
											size={14}
											color="var(--gd-color-text-tertiary)"
										/>
									}
								>
									{t("verify.result.project", "Project")}
								</SectionLabel>
								<Flex gap={14} align="center">
									<Flex
										justify="center"
										align="center"
										style={{
											flex: "0 0 56px",
											width: 56,
											height: 56,
											borderRadius: 10,
											background: data.project.coverImage
												? `url("${data.project.coverImage}") center/cover`
												: "var(--gd-color-surface-sunken)",
											color: "var(--gd-neutral-600)",
										}}
									>
										{!data.project.coverImage && <IconFolder size={24} />}
									</Flex>
									<Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
										<Title level={5} style={{ margin: 0, fontWeight: 600 }}>
											{data.project.name}
										</Title>
										{data.participant.position && (
											<Paragraph
												ellipsis={{ rows: 3 }}
												type="secondary"
												style={{ fontSize: 13 }}
											>
												{data.participant.position}
											</Paragraph>
										)}
									</Flex>
								</Flex>
								{data.project.shortDescription && (
									<Paragraph
										ellipsis={{ rows: 3 }}
										type="secondary"
										style={{ fontSize: 13, lineHeight: 1.5 }}
									>
										{data.project.shortDescription}
									</Paragraph>
								)}

								<Button
									type="text"
									href={`/project/${data.project.slug}`}
									target="_blank"
									icon={<IconExternalLink size={16} />}
									iconPosition="end"
								>
									{t("verify.result.viewProject", "View project")}
								</Button>
							</Flex>
						</Card>
					)}

					<Card styles={{ body: cardBody }}>
						<Flex vertical gap={16}>
							<SectionLabel
								icon={
									<IconCalendarEvent
										size={14}
										color="var(--gd-color-text-tertiary)"
									/>
								}
							>
								{t("verify.result.event", "Event")}
							</SectionLabel>
							<Flex gap={14} align="center">
								<Flex
									justify="center"
									align="center"
									style={{
										flex: "0 0 48px",
										width: 48,
										height: 48,
										borderRadius: 10,
										background: "var(--gd-color-surface-sunken)",
										color: "var(--gd-neutral-600)",
									}}
								>
									<IconCalendarEvent size={24} />
								</Flex>
								<Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
									{data.event.slug ? (
										<Link
											href={`/event/${data.event.slug}`}
											style={{ color: "inherit" }}
										>
											<Title level={5} style={{ margin: 0, fontWeight: 600 }}>
												{data.event.title}
											</Title>
										</Link>
									) : (
										<Title level={5} style={{ margin: 0, fontWeight: 600 }}>
											{data.event.title}
										</Title>
									)}
									<Text type="secondary" style={{ fontSize: 13 }}>
										{data.event.type}
									</Text>
								</Flex>
							</Flex>
							<Flex vertical gap={14}>
								<Space size={48} wrap>
									<MetaItem
										label={t("verify.result.startDate", "Start date")}
										value={formatDate(data.event.startDate)}
									/>
									<MetaItem
										label={t("verify.result.endDate", "End date")}
										value={formatDate(data.event.endDate)}
									/>
								</Space>
								{data.event.organizerName && (
									<MetaItem
										label={t("verify.result.organizer", "Organizer")}
										value={
											data.event.organizerName +
											(data.event.organizerTitle
												? ` · ${data.event.organizerTitle}`
												: "")
										}
									/>
								)}
								{data.event.mentorName && (
									<MetaItem
										label={t("verify.result.mentor", "Lead mentor")}
										value={
											data.event.mentorName +
											(data.event.mentorSpecialty
												? ` · ${data.event.mentorSpecialty}`
												: "")
										}
									/>
								)}

								<Button
									type="text"
									href={`/event/${data.event.slug}`}
									target="_blank"
									icon={<IconExternalLink size={16} />}
									iconPosition="end"
								>
									{t("verify.result.viewEvent", "View event")}
								</Button>
							</Flex>
						</Flex>
					</Card>
				</Flex>
			</Col>

			<Col xs={24} lg={14}>
				<Card style={{ overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
					<Flex
						justify="space-between"
						align="center"
						wrap="wrap"
						gap={8}
						style={{
							padding: "14px 16px",
						}}
					>
						<Flex gap={10} align="center" style={{ minWidth: 0 }}>
							<Flex
								justify="center"
								align="center"
								style={{
									flex: "0 0 32px",
									width: 32,
									height: 32,
									borderRadius: 8,
									background: "var(--gd-danger-tint)",
									color: "var(--gd-danger-solid)",
								}}
							>
								<IconFileText size={16} />
							</Flex>
							<Flex vertical gap={2} style={{ minWidth: 0 }}>
								<Text
									strong
									style={{ fontSize: 13 }}
									ellipsis={{ tooltip: fileName }}
								>
									Certificate preview
								</Text>
								<Text type="secondary" style={{ fontSize: 12 }}>
									{t("verify.result.signedPdf", "Signed PDF")}
								</Text>
							</Flex>
						</Flex>
					</Flex>
					<div className={styles.pdfViewer}>
						<iframe src={pdfUrl} title={fileName} />
					</div>
				</Card>
			</Col>
		</Row>
	);
};
