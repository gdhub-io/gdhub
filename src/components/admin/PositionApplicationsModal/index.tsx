"use client";

import {
	IconExternalLink,
	IconEye,
	IconEyeOff,
	IconMessageCircle,
	IconMessageCircleOff,
	IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Button, Flex, Modal, Skeleton, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";
import SpecialistPreviewModal from "@/components/modals/SpecialistPreviewModal";
import { LoadError, StatusDot, type StatusTone } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { skillLevelsList } from "@/components/ui/skillLevel";
import { VacancyApplicationStatus } from "@/config/prisma-enums";
import type {
	AdminPositionApplication,
	AdminPositionDetail,
} from "@/types/vacancy";
import {
	formatFee,
	LISTING_LABEL,
	LISTING_TONE,
	POSITION_LABEL,
	POSITION_TONE,
} from "./copy";
import styles from "./style.module.scss";

const { Text, Paragraph } = Typography;

const DATE = "D MMM YYYY";
const day = (value: string) => dayjs(value).format("D MMM");

const STATUS: Record<
	VacancyApplicationStatus,
	{ tone: StatusTone; label: string }
> = {
	[VacancyApplicationStatus.Submitted]: { tone: "info", label: "Submitted" },
	[VacancyApplicationStatus.Hired]: { tone: "success", label: "Hired" },
	[VacancyApplicationStatus.Rejected]: { tone: "neutral", label: "Rejected" },
	[VacancyApplicationStatus.Withdrawn]: { tone: "neutral", label: "Withdrawn" },
};

/** Why a chat closed is not stored; the application's outcome says it. */
const CLOSED_ON: Partial<Record<VacancyApplicationStatus, string>> = {
	[VacancyApplicationStatus.Hired]: "on hire",
	[VacancyApplicationStatus.Rejected]: "on rejection",
	[VacancyApplicationStatus.Withdrawn]: "on withdrawal",
};

const chatLine = (application: AdminPositionApplication) => {
	const { chat, status } = application;
	if (!chat) {
		return status === VacancyApplicationStatus.Rejected
			? "No chat — rejected without a conversation"
			: "No chat yet";
	}
	if (!chat.open) {
		const reason = CLOSED_ON[status];
		return `Chat closed ${chat.closedAt ? day(chat.closedAt) : ""}${reason ? `, ${reason}` : ""} · opened ${day(chat.openedAt)}`;
	}
	return chat.authorLastReadAt
		? `Chat opened ${day(chat.openedAt)} · author last read ${day(chat.authorLastReadAt)}`
		: `Chat opened ${day(chat.openedAt)} · not read by the author yet`;
};

/** Frames 10.20 (`ESAPb`) and 10.20.1: a position's applications, read-only. */
export function PositionApplicationsModal({
	id,
	onClose,
}: {
	id: string | null;
	onClose: () => void;
}) {
	const [talent, setTalent] = useState<string>();
	const { data, isLoading, isError, isLoadingError, refetch } = useQuery({
		queryKey: ["admin", "open-positions", id],
		queryFn: () =>
			axios
				.get<AdminPositionDetail>(`/api/admin/open-positions/${id}`)
				.then((response) => response.data),
		enabled: !!id,
	});

	return (
		<Modal
			open={!!id}
			onCancel={onClose}
			footer={null}
			closable={false}
			width={760}
			className={styles.modal}
		>
			<Flex
				justify="space-between"
				align="flex-start"
				gap={16}
				className={styles.head}
			>
				{data ? (
					<Flex vertical gap={6} className={styles.min0}>
						<Text className={styles.title}>{data.title}</Text>
						<Flex gap={12} align="center" wrap className={styles.meta}>
							{data.project && (
								<Link href={`/project/${data.project.slug}`}>
									{data.project.name}
								</Link>
							)}
							<StatusDot
								tone={POSITION_TONE[data.state]}
								label={POSITION_LABEL[data.state]}
							/>
							<StatusDot
								tone={LISTING_TONE[data.listing]}
								label={
									data.listingFee
										? `${LISTING_LABEL.paid} · ${formatFee(data.listingFee)}`
										: LISTING_LABEL[data.listing]
								}
							/>
							<Text type="secondary" className={styles.meta}>
								Relevant until {dayjs(data.finishedAt).format(DATE)}
							</Text>
						</Flex>
					</Flex>
				) : isError ? (
					<Flex />
				) : (
					<Skeleton
						active
						title={{ width: 240 }}
						paragraph={{ rows: 1, width: 360 }}
					/>
				)}
				<Flex gap={8} align="center" className={styles.actions}>
					{data && (
						<Link href={`/job/${data.id}`} target="_blank">
							<Button
								type="link"
								icon={<IconExternalLink size={14} />}
								iconPlacement="end"
							>
								Open position
							</Button>
						</Link>
					)}
					<Button
						type="text"
						aria-label="Close"
						icon={<IconX size={18} />}
						onClick={onClose}
					/>
				</Flex>
			</Flex>
			{isLoadingError ? (
				<LoadError onRetry={refetch} />
			) : isLoading || !data ? (
				<Skeleton active title={false} paragraph={{ rows: 6 }} />
			) : (
				<Flex vertical gap={12}>
					<Flex justify="space-between">
						<Text strong className={styles.section}>
							Applications
							{data.applications.length ? ` · ${data.applications.length}` : ""}
						</Text>
						{data.applications.length > 0 && (
							<Text type="secondary" className={styles.meta}>
								Newest first
							</Text>
						)}
					</Flex>
					{data.applications.length ? (
						// ui-guard-ignore frame 10.20 draws an outlined list of applications; antd's List is deprecated in v6.
						<div className={styles.list}>
							{data.applications.map((application) => (
								<ApplicationRow
									key={application.id}
									application={application}
									onCandidate={() => setTalent(application.speciality.id)}
								/>
							))}
						</div>
					) : (
						<Text type="secondary">No applications yet.</Text>
					)}
				</Flex>
			)}
			<SpecialistPreviewModal
				open={!!talent}
				specialistId={talent}
				withOffer={false}
				onCancel={() => setTalent(undefined)}
			/>
		</Modal>
	);
}

function ApplicationRow({
	application,
	onCandidate,
}: {
	application: AdminPositionApplication;
	onCandidate: () => void;
}) {
	const level = skillLevelsList.find(
		(item) => item.value === application.speciality.level,
	);
	const status = STATUS[application.status];

	return (
		<div className={styles.item}>
			<Flex gap={12} className={styles.row}>
				<AppAvatar size={32} src={application.candidate.image ?? undefined}>
					{application.candidate.name?.[0]}
				</AppAvatar>
				<Flex vertical gap={4} flex={1} className={styles.min0}>
					<Flex justify="space-between" align="center" gap={12}>
						<Flex gap={8} align="center" className={styles.min0}>
							<Button
								type="link"
								size="small"
								className={styles.name}
								onClick={onCandidate}
							>
								{application.candidate.name}
							</Button>
							<Text type="secondary" className={styles.meta} ellipsis>
								{application.speciality.name}
								{level && <> · {level.label}</>}
							</Text>
						</Flex>
						<Flex gap={16} align="center">
							<StatusDot tone={status.tone} label={status.label} />
							<Text type="secondary" className={styles.meta}>
								{dayjs(application.createdAt).format(DATE)}
							</Text>
						</Flex>
					</Flex>
					<Paragraph
						type={application.message ? "secondary" : undefined}
						className={styles.message}
					>
						{application.message || <Text type="secondary">No message.</Text>}
					</Paragraph>
					{application.allowedContacts.length > 0 && (
						<Text type="secondary" className={styles.meta}>
							Contacts allowed: {application.allowedContacts.join(" · ")}
						</Text>
					)}
					<Flex gap={6} align="center" className={styles.signal}>
						{application.viewedAt ? (
							<IconEye size={13} />
						) : (
							<IconEyeOff size={13} />
						)}
						<Text type="secondary" className={styles.meta}>
							{application.viewedAt
								? `Viewed by the project ${day(application.viewedAt)}`
								: "Not viewed by the project"}
						</Text>
					</Flex>
					<Flex gap={6} align="center" className={styles.signal}>
						{application.chat ? (
							<IconMessageCircle size={13} />
						) : (
							<IconMessageCircleOff size={13} />
						)}
						<Text type="secondary" className={styles.meta}>
							{chatLine(application)}
						</Text>
					</Flex>
				</Flex>
			</Flex>
		</div>
	);
}
