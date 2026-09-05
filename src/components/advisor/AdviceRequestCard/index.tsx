"use client";

import {
	IconMessageCircleQuestion,
	IconRocket,
	IconUser,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import dayjs from "dayjs";
import { REQUEST_STATUS } from "@/components/advisor/requestStatus";
import { getWorkDirection } from "@/components/DirectionBadge";
import { AdviceRequestStatus } from "@/config/prisma-enums";
import type { AdvisorRequest } from "@/repositories/advisor.requests";
import styles from "./style.module.scss";

export type AdviceRequestCardProps = {
	request: AdvisorRequest;
	/** The speciality the question was asked in, when it is knowable. */
	askedIn: string | null;
	busy?: boolean;
	onShowDetails: (request: AdvisorRequest) => void;
	onDecline: (request: AdvisorRequest) => void;
	onMarkDone: (request: AdvisorRequest) => void;
	onOpenChat: (request: AdvisorRequest) => void;
};

/**
 * One question in the advisor's inbox.
 *
 * A card and not a table row: what has to be read here is a person and a
 * question, and a row can carry neither at a length that means anything.
 */
export function AdviceRequestCard({
	request,
	askedIn,
	busy,
	onShowDetails,
	onDecline,
	onMarkDone,
	onOpenChat,
}: AdviceRequestCardProps) {
	const { t } = useTranslate();
	const status = REQUEST_STATUS[request.status];
	const direction = request.asker.direction
		? getWorkDirection(request.asker.direction)
		: null;
	const DirectionIcon = direction?.icon ?? IconMessageCircleQuestion;

	const who = [request.asker.name, request.asker.role]
		.filter(Boolean)
		.join(" · ");
	const where = request.project
		? [request.project.name, request.project.stage].filter(Boolean).join(" · ")
		: null;

	return (
		<article className={styles.card}>
			<div className={styles.identity}>
				<span
					className={styles.tile}
					style={direction ? { background: direction.color } : undefined}
				>
					<DirectionIcon size={22} stroke={2} color={direction?.ink} />
				</span>

				<div className={styles.text}>
					<div className={styles.chips}>
						<span className={styles.chip} data-tone={status.tone}>
							{t(status.key, status.label)}
						</span>
						<span className={styles.time}>
							{dayjs(request.askedAt).fromNow()}
						</span>
					</div>

					<h3 className={styles.topic}>
						{request.topic ||
							t("advisor.requests.card.noTopic", "A question with no subject")}
					</h3>

					<div className={styles.meta}>
						<span className={styles.metaItem}>
							<IconUser size={12} stroke={2} />
							<span>{who}</span>
						</span>
						{where && (
							<span className={styles.metaItem}>
								<IconRocket size={12} stroke={2} />
								<span>{where}</span>
							</span>
						)}
					</div>
				</div>
			</div>

			{request.question && <p className={styles.body}>{request.question}</p>}

			<div className={styles.foot}>
				{askedIn && (
					<span className={styles.askedIn}>
						<IconMessageCircleQuestion size={14} stroke={2} />
						{t("advisor.requests.card.askedIn", "Asked in {speciality}", {
							speciality: askedIn,
						})}
					</span>
				)}

				<div className={styles.actions}>
					{request.status === AdviceRequestStatus.Created && (
						<Button disabled={busy} onClick={() => onDecline(request)}>
							{t("advisor.requests.action.decline", "Decline")}
						</Button>
					)}

					{request.status === AdviceRequestStatus.Approved ? (
						<>
							<Button disabled={busy} onClick={() => onMarkDone(request)}>
								{t("advisor.requests.action.markDone", "Mark done")}
							</Button>
							<Button type="primary" onClick={() => onOpenChat(request)}>
								{t("advisor.requests.action.openChat", "Open chat")}
							</Button>
						</>
					) : (
						<Button type="primary" onClick={() => onShowDetails(request)}>
							{t("advisor.requests.action.showDetails", "Show details")}
						</Button>
					)}
				</div>
			</div>
		</article>
	);
}
