"use client";

import {
	type Icon,
	IconBell,
	IconEye,
	IconFileCheck,
	IconGavel,
	IconHeartbeat,
	IconNotes,
	IconPhoto,
	IconRefresh,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Avatar, Button, Flex, Segmented, Typography } from "antd";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { EvidenceMatchDot } from "@/components/checkpoints/EvidenceMatchTag";
import { VerdictChip } from "@/components/checkpoints/VerdictChip";
import { useArtifactTypeLabel } from "@/components/MyProjectArtifacts/labels";
import { IconTile } from "@/components/ui";
import { formatShort } from "@/components/WorkflowPath/dates";
import type { ProjectArtifactType } from "@/config/prisma-enums";
import type {
	CuratorJournalViewDto,
	JournalDraftTarget,
	JournalMessageDto,
} from "@/types/checkpoint-journal";
import { Boundary, FoldOuts, when } from "./parts";
import { RegenerateModal } from "./RegenerateModal";
import styles from "./style.module.scss";

const LOOK_ICON: Record<string, Icon> = {
	evidence: IconFileCheck,
	artifact: IconEye,
	media: IconPhoto,
};

/**
 * Frame 12.11.10: the checkpoint as a conversation, oldest at the top. The
 * curator and the platform speak on the left, the author and the team on the
 * right; it opens on the newest, as a chat does.
 */
export function Conversation({
	checkpointId,
	view,
}: {
	checkpointId: string;
	view: CuratorJournalViewDto;
}) {
	const { t } = useTranslate();
	const [target, setTarget] = useState<JournalDraftTarget | null>(null);
	const rebuildable = (step: number) =>
		view.steps.find((row) => row.sprint === step)?.rebuildable ?? false;
	const rebuildButton = (step: number) =>
		rebuildable(step) && (
			<RefreshLink onClick={() => setTarget({ step })}>
				{t("admin.journal.action.rebuild", "Rebuild input")}
			</RefreshLink>
		);
	const list = useRef<HTMLDivElement>(null);
	const [picked, setPicked] = useState<string | null>(null);
	const marks = useRef(new Map<string, HTMLDivElement>());

	useLayoutEffect(() => {
		const element = list.current;
		if (element) element.scrollTop = element.scrollHeight;
	}, []);

	const goTo = (key: string) => {
		const element = list.current;
		const mark = marks.current.get(key);
		if (element && mark) {
			element.scrollTo({
				top: mark.offsetTop - element.offsetTop,
				behavior: "smooth",
			});
		}
	};
	const mark = (key: string) => (element: HTMLDivElement | null) => {
		if (element) marks.current.set(key, element);
	};

	const rows: ReactNode[] = [];
	if (rebuildable(0)) {
		rows.push(
			<Boundary
				key="day-one"
				label={t("admin.journal.dayOne", "Day one")}
				extra={rebuildButton(0)}
			/>,
		);
	}
	let shown = 0;
	const reached = new Set<string>();
	for (const message of view.messages) {
		const sprint = view.sprints.find((row) => row.number === message.sprint);
		if (sprint && sprint.number > shown) {
			shown = sprint.number;
			reached.add(String(sprint.number));
			rows.push(
				<Boundary
					key={`sprint-${sprint.number}`}
					ref={mark(String(sprint.number))}
					extra={rebuildButton(sprint.number)}
					label={t(
						"admin.checkpoints.journal.sprintRange",
						"Sprint {number} · {from} – {to}",
						{
							number: sprint.number,
							from: formatShort(sprint.from),
							to: formatShort(sprint.to),
						},
					)}
				/>,
			);
		}
		rows.push(
			<Message
				key={message.id}
				message={message}
				view={view}
				onRegenerate={
					message.regenerable
						? () => setTarget({ entryId: message.id })
						: undefined
				}
			/>,
		);
	}
	if (view.finishedAt) {
		reached.add("verdict");
		rows.push(
			<Boundary
				key="finished"
				ref={mark("verdict")}
				label={t(
					"admin.checkpoints.journal.finished",
					"Checkpoint finished · {date}",
					{
						date: formatShort(view.finishedAt),
					},
				)}
			/>,
		);
	}

	return (
		<Flex vertical gap={16}>
			<Segmented
				className={styles.switcher}
				// The list opens on the newest, so the switcher does too.
				value={picked ?? [...reached].at(-1)}
				onChange={(key) => {
					setPicked(key);
					goTo(key);
				}}
				options={[
					...view.sprints.map((sprint) => ({
						value: String(sprint.number),
						label: t("admin.checkpoints.journal.sprint", "Sprint {sprint}", {
							sprint: sprint.number,
						}),
						disabled: !reached.has(String(sprint.number)),
					})),
					{
						value: "verdict",
						label: t("admin.checkpoints.journal.verdict", "Verdict"),
						disabled: !reached.has("verdict"),
					},
				]}
			/>
			<Flex ref={list} vertical gap={16} className={styles.conversation}>
				{rows.length ? (
					rows
				) : (
					<Typography.Text type="secondary">
						{t(
							"admin.checkpoints.journal.conversationEmpty",
							"Nothing here yet. Messages appear as the curator, the platform and the team act.",
						)}
					</Typography.Text>
				)}
			</Flex>
			{target && (
				<RegenerateModal
					checkpointId={checkpointId}
					view={view}
					target={target}
					onClose={() => setTarget(null)}
				/>
			)}
		</Flex>
	);
}

/** One line of the conversation; the regenerate draft renders the same way (GDHUB-156). */
export function Message({
	message,
	view,
	onRegenerate,
}: {
	message: JournalMessageDto;
	view: CuratorJournalViewDto;
	onRegenerate?: () => void;
}) {
	const { t } = useTranslate();
	const edits = message.history.length > 0 && (
		<Typography.Text type="secondary" className={styles.meta}>
			{t("admin.journal.edited", "Edited {count}×", {
				count: message.history.length,
			})}
		</Typography.Text>
	);
	const regenerate = onRegenerate && (
		<RefreshLink onClick={onRegenerate}>
			{t("admin.journal.action.regenerate", "Regenerate")}
		</RefreshLink>
	);
	const foldOuts = (
		<FoldOuts
			details={message.details}
			source={message.source}
			history={message.history}
		/>
	);
	const typeLabel = useArtifactTypeLabel();
	const { who, title } = message;

	if (message.side === "team") {
		const line = {
			artifact: t(
				"admin.checkpoints.journal.team.artifact",
				"Added {type} “{name}”",
				{
					type: message.variant
						? typeLabel(message.variant as ProjectArtifactType)
						: "",
					name: title ?? "",
				},
			),
			devlog: t(
				"admin.checkpoints.journal.team.devlog",
				"Posted devlog #{number}: {title}",
				{
					number: message.variant ?? "",
					title: title ?? "",
				},
			),
			pulse: t(
				"admin.checkpoints.journal.team.pulse",
				"Answered the pulse: working this sprint",
			),
			tasksSent: t(
				"admin.checkpoints.journal.team.tasksSent",
				"Sent the tasks for the curator's check",
			),
			planApproved: t(
				"admin.checkpoints.journal.team.planApproved",
				"Approved the plan",
			),
			tasksConfirmed: t(
				"admin.checkpoints.journal.team.tasksConfirmed",
				"Confirmed the tasks for the second half",
			),
		}[message.kind as "artifact"];
		return (
			<Flex gap={12} justify="end">
				<Flex vertical gap={4} align="end" className={styles.side}>
					<Typography.Text type="secondary" className={styles.meta}>
						{who ?? t("admin.checkpoints.journal.team.someone", "The team")} ·{" "}
						{when(message.at)}
					</Typography.Text>
					<Typography.Text className={styles.teamBubble}>
						{line}
					</Typography.Text>
					<FoldOuts details={message.details} source={message.source} />
				</Flex>
				<Avatar size={32}>{(who ?? "?").charAt(0)}</Avatar>
			</Flex>
		);
	}

	if (message.kind === "letter") {
		const label = {
			first: t("admin.checkpoints.journal.letter.first", "First letter"),
			tasksCheck: t(
				"admin.checkpoints.journal.letter.tasksCheck",
				"Tasks checked",
			),
			advice: t(
				"admin.checkpoints.journal.letter.advice",
				"Advice on the tasks",
			),
			plan: t("admin.checkpoints.journal.letter.plan", "The plan approved"),
			review: t(
				"admin.checkpoints.journal.letter.review",
				"Sprint {sprint} review",
				{
					sprint: title ?? "",
				},
			),
			final: t("admin.checkpoints.journal.letter.finalReview", "Final review"),
			report: t("admin.checkpoints.journal.letter.report", "Verdict report"),
		}[message.variant ?? "review"];
		return (
			<Flex gap={12}>
				<Avatar size={32} src={view.curator.avatar}>
					{view.curator.name.charAt(0)}
				</Avatar>
				<Flex vertical gap={4} className={styles.side}>
					<Typography.Text type="secondary" className={styles.meta}>
						<Typography.Text strong>{view.curator.name}</Typography.Text> ·{" "}
						{label} · {when(message.at)}
					</Typography.Text>
					<Typography.Paragraph className={styles.curatorBubble}>
						{message.text}
					</Typography.Paragraph>
					{(edits || regenerate) && (
						<Flex gap={8} align="center">
							{edits}
							{regenerate}
						</Flex>
					)}
					{foldOuts}
				</Flex>
			</Flex>
		);
	}

	const notRead = message.unread
		? t("admin.checkpoints.journal.unread", "Not read — {why}", {
				why: message.unread,
			})
		: null;
	const shape = {
		brief: {
			icon: IconNotes,
			line: t("admin.checkpoints.journal.brief", "Brief before call {call}", {
				call: title ?? "",
			}),
		},
		looked: {
			icon: LOOK_ICON[message.variant ?? "evidence"] ?? IconEye,
			line: {
				evidence: t(
					"admin.checkpoints.journal.looked.evidence",
					"Looked at “{name}” against its task",
					{
						name: title ?? "",
					},
				),
				artifact: t(
					"admin.checkpoints.journal.looked.artifact",
					"Looked at the sprint artifact “{name}”",
					{
						name: title ?? "",
					},
				),
				media: t(
					"admin.checkpoints.journal.looked.media",
					"Read the media of the devlog “{name}”",
					{
						name: title ?? "",
					},
				),
			}[message.variant ?? "evidence"],
		},
		verdict: {
			icon: IconGavel,
			line: !message.verdict?.settled
				? t("admin.checkpoints.journal.aiRead", "The AI's read of the verdict")
				: message.verdict.by === "curator"
					? t(
							"admin.checkpoints.journal.curatorSent",
							"Verdict sent by the curator",
						)
					: t("admin.checkpoints.journal.settled", "Verdict settled"),
		},
		sent: {
			icon: IconBell,
			line: t(
				"admin.checkpoints.journal.platformSent",
				"Sent {who} “{title}”",
				{
					who: who ?? "",
					title: title ?? "",
				},
			),
		},
		pulseCounted: {
			icon: IconHeartbeat,
			line: t(
				"admin.checkpoints.journal.pulseCounted",
				"Counted {who} as working · from {source}",
				{
					who: who ?? "",
					source: message.variant ?? "",
				},
			),
		},
		planApproved: {
			icon: IconFileCheck,
			line: t(
				"admin.checkpoints.journal.goalAgreed",
				"The goal agreed on call 1",
			),
		},
	}[message.kind as "brief"];
	const side =
		message.side === "platform"
			? t("admin.checkpoints.journal.platform", "Platform")
			: view.curator.name;

	return (
		<Flex gap={12}>
			<IconTile icon={shape.icon} size="xs" />
			<Flex vertical gap={4} className={styles.side}>
				<Flex gap={8} align="center" wrap>
					<Typography.Text>{shape.line}</Typography.Text>
					{message.match && <EvidenceMatchDot match={message.match} />}
					{message.verdict?.proposed && (
						<VerdictChip verdict={message.verdict.proposed} />
					)}
					{message.verdict?.settled &&
						message.verdict.proposed !== message.verdict.settled && (
							<>
								→ <VerdictChip verdict={message.verdict.settled} />
							</>
						)}
				</Flex>
				{message.text && (
					<Typography.Text type="secondary">{message.text}</Typography.Text>
				)}
				{notRead && (
					<Typography.Text type="secondary">{notRead}</Typography.Text>
				)}
				<Flex gap={8} align="center" wrap>
					<Typography.Text type="secondary" className={styles.meta}>
						{side} · {when(message.at)}
					</Typography.Text>
					{edits}
					{regenerate}
				</Flex>
				{foldOuts}
			</Flex>
		</Flex>
	);
}

/** The small link that writes an answer or a step's input again. */
function RefreshLink({
	onClick,
	children,
}: {
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<Button
			type="link"
			size="small"
			icon={<IconRefresh size={14} />}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}
