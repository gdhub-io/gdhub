"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Modal, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { Fragment } from "react";
import { REQUEST_STATUS } from "@/components/advisor/requestStatus";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { StatusDot } from "@/components/ui/StatusDot";
import { AdviceRequestStatus } from "@/config/prisma-enums";
import type { AdvisorRequest } from "@/repositories/advisor.requests";
import styles from "./style.module.scss";

const { Text } = Typography;

/** Bare `http(s)` runs, captured so `split` keeps them as their own parts. */
const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]])/g;

/** Without `g`: a global regex carries `lastIndex` and would skip every other link. */
const IS_URL = /^https?:\/\//;

/** Split, never parsed into HTML: the text is someone else's. */
function QuestionText({ text }: { text: string }) {
	return (
		<p className={styles.text}>
			{text.split(URL_PATTERN).map((part, index) =>
				IS_URL.test(part) ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: the split is positional
					<a key={index} href={part} target="_blank" rel="noopener noreferrer">
						{part}
					</a>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: the split is positional
					<Fragment key={index}>{part}</Fragment>
				),
			)}
		</p>
	);
}

export type AdviceRequestModalProps = {
	request: AdvisorRequest | null;
	busy?: boolean;
	onClose: () => void;
	onAccept: (request: AdvisorRequest) => void;
	onDecline: (request: AdvisorRequest) => void;
	onOpenChat: (request: AdvisorRequest) => void;
	onViewTalentCard: (specialityId: string) => void;
};

/**
 * The whole question, and the decision on it.
 *
 * Status and date sit in the header, not beside the person: they describe the
 * request, and in the identity block they read as facts about the asker.
 */
export function AdviceRequestModal({
	request,
	busy,
	onClose,
	onAccept,
	onDecline,
	onOpenChat,
	onViewTalentCard,
}: AdviceRequestModalProps) {
	const { t } = useTranslate();

	if (!request) return null;

	const status = REQUEST_STATUS[request.status];
	const { specialityId } = request.asker;
	const isNew = request.status === AdviceRequestStatus.Created;
	const isAccepted = request.status === AdviceRequestStatus.Approved;

	return (
		<Modal
			open
			width={720}
			onCancel={onClose}
			title={
				<>
					<div>{t("advisor.requests.modal.title", "Advice request")}</div>
					<span className={styles.state}>
						<StatusDot tone={status.tone} label={t(status.key, status.label)} />
						<span>·</span>
						<span>
							{t("advisor.requests.modal.asked", "asked {when}", {
								when: dayjs(request.askedAt).fromNow(),
							})}
						</span>
					</span>
				</>
			}
			footer={
				isNew ? (
					<>
						<Button disabled={busy} onClick={() => onDecline(request)}>
							{t("advisor.requests.action.decline", "Decline")}
						</Button>
						<Button
							type="primary"
							loading={busy}
							onClick={() => onAccept(request)}
						>
							{t("advisor.requests.action.accept", "Accept & open chat")}
						</Button>
					</>
				) : isAccepted ? (
					<Button type="primary" onClick={() => onOpenChat(request)}>
						{t("advisor.requests.action.openChat", "Open chat")}
					</Button>
				) : null
			}
		>
			<div className={styles.body}>
				<section>
					<span className={styles.caption}>
						{t("advisor.requests.modal.askedBy", "Asked by")}
					</span>
					<div className={styles.row}>
						<AppAvatar size={40} src={request.asker.image}>
							{request.asker.name.charAt(0)}
						</AppAvatar>
						<div className={styles.rowText}>
							<span className={styles.rowName}>{request.asker.name}</span>
							{request.asker.role && (
								<span className={styles.rowNote}>
									{request.project
										? t(
												"advisor.requests.modal.roleOn",
												"{role} on {project}",
												{
													role: request.asker.role,
													project: request.project.name,
												},
											)
										: request.asker.role}
								</span>
							)}
						</div>
						{specialityId && (
							<Button
								type="link"
								onClick={() => onViewTalentCard(specialityId)}
							>
								{t("advisor.requests.modal.talentCard", "View talent card")}
							</Button>
						)}
					</div>
				</section>

				<section className={styles.question}>
					<span className={styles.caption}>
						{t("advisor.requests.modal.question", "Question")}
					</span>
					{request.topic && <h4 className={styles.topic}>{request.topic}</h4>}
					{request.question ? (
						<QuestionText text={request.question} />
					) : (
						<Text type="secondary">
							{t(
								"advisor.requests.modal.noQuestion",
								"The subject is all that was sent.",
							)}
						</Text>
					)}
				</section>

				{request.project && (
					<section>
						<span className={styles.caption}>
							{t("advisor.requests.modal.project", "Project")}
						</span>
						<div className={styles.row}>
							<div className={styles.rowText}>
								<span className={styles.rowName}>{request.project.name}</span>
								{request.project.stage && (
									<span className={styles.rowNote}>
										{request.project.stage}
									</span>
								)}
							</div>
							<Link
								href={`/project/${request.project.slug}`}
								target="_blank"
								rel="noopener"
							>
								{t("advisor.requests.modal.openProject", "Open project")}
							</Link>
						</div>
					</section>
				)}

				{isNew && (
					<p className={styles.hint}>
						<IconInfoCircle size={16} stroke={2} />
						{t(
							"advisor.requests.modal.acceptHint",
							"Accepting opens a 1-to-1 chat with the person who asked.",
						)}
					</p>
				)}
			</div>
		</Modal>
	);
}
