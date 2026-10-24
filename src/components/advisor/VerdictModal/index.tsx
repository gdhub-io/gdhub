"use client";

import {
	IconCheck,
	IconCircle,
	IconCircleCheck,
	IconCircleMinus,
	IconCube,
	IconDeviceGamepad2,
	IconExternalLink,
	IconLock,
	IconPaperclip,
	IconSparkles,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	App,
	Button,
	Collapse,
	Flex,
	Input,
	Modal,
	Radio,
	Segmented,
	Skeleton,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { type ReactNode, useState } from "react";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import { EvidenceMatchTag } from "@/components/checkpoints/EvidenceMatchTag";
import {
	useVerdictCopy,
	VERDICT_ORDER,
	VERDICT_TONE,
	VerdictChip,
} from "@/components/checkpoints/VerdictChip";
import {
	BOX_TICK_STROKE,
	IconTile,
	SectionHeading,
	StatusDot,
} from "@/components/ui";
import { formatShort } from "@/components/WorkflowPath/dates";
import {
	SPRINTS_PER_CHECKPOINT,
	VERDICT_DRAFT_FROM_SPRINT,
	VERDICT_NOTE_MAX,
} from "@/config/checkpoint";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import { CheckpointItemKind, CheckpointVerdict } from "@/config/prisma-enums";
import {
	useAdvisorProject,
	useSaveVerdictDraft,
	useSendVerdict,
	useVerdictContext,
} from "@/hooks/checkpoints";
import { dayNumberOn } from "@/lib/checkpoint-days";
import { isProven } from "@/lib/checkpoint-verdict";
import {
	verdictDueBy,
	verdictOverdue,
	verdictSendOpensAt,
} from "@/lib/checkpoint-verdict-window";
import type {
	AdvisorCheckpointDto,
	AdvisorProjectDto,
	CheckpointItemDto,
	VerdictContextDto,
} from "@/types/checkpoints";
import styles from "./style.module.scss";

const { Text, Paragraph, Link } = Typography;

const SPRINTS = Array.from(
	{ length: SPRINTS_PER_CHECKPOINT },
	(_, index) => index + 1,
);

const byOrder = (a: CheckpointItemDto, b: CheckpointItemDto) =>
	a.order - b.order;

export type VerdictModalProps = {
	checkpoint: AdvisorCheckpointDto;
	onClose: () => void;
};

/**
 * An administrator writing the verdict a curator never sent (frames 11.8,
 * 11.8b): no draft, sending is open, and the refund for calls never held is
 * shown above the button.
 */
export type AdminVerdict = {
	missed: { provided: number; parts: number; refund: number } | null;
	send: (input: {
		verdict: CheckpointVerdict;
		note: string;
	}) => Promise<unknown>;
	sending: boolean;
};

/**
 * The human curator's verdict (frames `vC7gn`, `F041BL`): the evidence on the
 * left, the choice and its reasoning on the right. A draft can be kept from
 * sprint 4; sending opens with the final call and cannot be undone.
 */
export function VerdictModal({ checkpoint, onClose }: VerdictModalProps) {
	const { data: context } = useVerdictContext(checkpoint.id);
	const { data: project } = useAdvisorProject(checkpoint.id);

	return (
		<VerdictModalView
			checkpoint={checkpoint}
			context={context}
			project={project}
			onClose={onClose}
		/>
	);
}

export function VerdictModalView({
	checkpoint,
	context,
	project,
	onClose,
	admin,
}: VerdictModalProps & {
	context: VerdictContextDto | undefined;
	project: AdvisorProjectDto | undefined;
	admin?: AdminVerdict;
}) {
	const { t } = useTranslate();

	const stageName = (stage: { name: string; key: string | null }) =>
		stage.key ? t(stage.key, stage.name) : stage.name;

	return (
		<Modal
			open
			onCancel={onClose}
			footer={null}
			width={1048}
			centered
			classNames={{
				container: styles.container,
				header: styles.header,
				body: styles.body,
			}}
			title={
				<Flex vertical gap={8}>
					<Flex align="center" gap={12} wrap>
						<Text className={styles.title}>
							{t("advisor.verdict.title", "Write the verdict")}
						</Text>
						{context && <StageChip checkpoint={checkpoint} context={context} />}
					</Flex>
					<Flex align="center" gap={8} className={styles.meta}>
						<IconTile icon={IconDeviceGamepad2} size="xs" />
						<Text strong>{checkpoint.project.name}</Text>
						<Text type="secondary" className={styles.small}>
							{[
								t("checkpoints.number", "Checkpoint {number}", {
									number: checkpoint.number ?? checkpoint.order,
								}),
								context
									? stageName(context.currentStage)
									: checkpoint.stageName,
								checkpoint.startedAt && checkpoint.dueAt
									? dayRange(
											checkpoint.startedAt,
											checkpoint.dueAt,
											"D MMM YYYY",
										)
									: null,
							]
								.filter(Boolean)
								.join(" · ")}
						</Text>
					</Flex>
				</Flex>
			}
		>
			{!context || !project ? (
				<div className={styles.loading}>
					<Skeleton active paragraph={{ rows: 10 }} />
				</div>
			) : (
				<>
					{admin && (
						<Alert
							type="warning"
							showIcon
							className={styles.adminAlert}
							title={t(
								"admin.checkpoints.verdict.alert",
								"The curator did not send the verdict. You sign it as an administrator; the author sees it as the checkpoint's verdict.",
							)}
						/>
					)}
					<div className={styles.split}>
						<div className={styles.left}>
							{context.aiRead && <AiRead read={context.aiRead} />}
							<GoalCard checkpoint={checkpoint} />
							<LastBuild checkpoint={checkpoint} build={context.lastBuild} />
							<Devlogs devlogs={project.devlogs} />
							<TeamPulse team={project.team} />
						</div>
						<div className={styles.right}>
							{admin ||
							context.stage === "draft" ||
							context.stage === "send" ? (
								<VerdictForm
									checkpoint={checkpoint}
									context={context}
									admin={admin}
									stages={
										context.nextStage
											? {
													from: stageName(context.currentStage),
													to: stageName(context.nextStage),
												}
											: null
									}
									onSent={onClose}
								/>
							) : (
								<Text type="secondary">
									{context.stage === "early"
										? t(
												"advisor.verdict.opensIn",
												"The verdict opens in sprint {n}.",
												{ n: VERDICT_DRAFT_FROM_SPRINT },
											)
										: t("advisor.verdict.alreadySent", "The verdict is sent.")}
								</Text>
							)}
						</div>
					</div>
				</>
			)}
		</Modal>
	);
}

function StageChip({
	checkpoint,
	context,
}: {
	checkpoint: AdvisorCheckpointDto;
	context: VerdictContextDto;
}) {
	const { t } = useTranslate();

	if (context.stage === "draft" && checkpoint.startedAt)
		return (
			<StatusDot
				tone="warning"
				label={t("advisor.verdict.chipDraft", "Draft · final call {date}", {
					date: dayjs(
						verdictSendOpensAt(checkpoint.startedAt, context.finalCall),
					).format("D MMM"),
				})}
			/>
		);

	if (context.stage === "send" && context.dueAt)
		return (
			<StatusDot
				tone="warning"
				label={
					verdictOverdue(context.dueAt)
						? t("advisor.verdict.chipOverdue", "Verdict overdue")
						: t("advisor.verdict.chipDue", "Verdict due by {date}", {
								date: formatShort(verdictDueBy(context.dueAt).toISOString()),
							})
				}
			/>
		);

	return null;
}

/** A section of the left column: a 16px title over a hairline, an aside on the right. */
function Section({
	title,
	aside,
	children,
}: {
	title: string;
	aside?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section>
			<div className={styles.sectionHead}>
				<SectionHeading level={4} title={title} action={aside} />
			</div>
			{children}
		</section>
	);
}

function Aside({ children }: { children: ReactNode }) {
	return <Text className={styles.aside}>{children}</Text>;
}

function ArtifactLink({
	artifact,
}: {
	artifact: NonNullable<CheckpointItemDto["artifact"]>;
}) {
	const { t } = useTranslate();

	return (
		<Link
			href={artifact.link}
			target="_blank"
			rel="noreferrer"
			className={styles.small}
			ellipsis
		>
			{artifact.name ?? t("advisor.verdict.artifact", "Artifact")}
		</Link>
	);
}

/**
 * Frame `vC7gn`: the verdict the AI would propose from the evidence, the
 * devlogs and the call notes (GDHUB-114). A reference only — the curator's
 * fields are their own and start empty.
 */
function AiRead({ read }: { read: NonNullable<VerdictContextDto["aiRead"]> }) {
	const { t } = useTranslate();

	return (
		<section className={styles.aiRead}>
			<Flex gap={12} align="center">
				<IconTile icon={IconSparkles} size="sm" />
				<Flex vertical>
					<Text strong>
						{t("advisor.verdict.aiRead.title", "The AI's read")}
					</Text>
					<Text type="secondary" className={styles.small}>
						{t(
							"advisor.verdict.aiRead.subtitle",
							"A reference for you. The decision and the words are yours.",
						)}
					</Text>
				</Flex>
			</Flex>
			<Flex gap={8} align="center" wrap>
				<Text type="secondary" className={styles.small}>
					{t("advisor.verdict.aiRead.proposes", "Would propose")}
				</Text>
				<VerdictChip verdict={read.proposed} />
			</Flex>
			<Text className={styles.small}>{read.summary}</Text>
			<Text type="secondary" className={styles.small}>
				{read.unproven.length
					? t(
							"advisor.verdict.aiRead.unproven",
							"No artifact that opens: {outcomes}",
							{ outcomes: read.unproven.map((item) => item.text).join("; ") },
						)
					: t(
							"advisor.verdict.aiRead.allProven",
							"Every outcome has an artifact that opens.",
						)}
			</Text>
			{read.evidence.length > 0 && (
				<Collapse
					ghost
					size="small"
					items={[
						{
							key: "evidence",
							label: t(
								"advisor.verdict.aiRead.evidence",
								"What each artifact shows",
							),
							children: (
								<Flex vertical gap={8}>
									{read.evidence.map((row) => (
										<Flex key={row.name} vertical gap={2}>
											<Flex gap={8} align="center" wrap>
												<Text strong className={styles.small}>
													{row.name}
												</Text>
												<EvidenceMatchTag match={row.match} />
											</Flex>
											{row.note && (
												<Text type="secondary" className={styles.small}>
													{row.note}
												</Text>
											)}
										</Flex>
									))}
								</Flex>
							),
						},
					]}
				/>
			)}
		</section>
	);
}

function GoalCard({ checkpoint }: { checkpoint: AdvisorCheckpointDto }) {
	const { t } = useTranslate();
	const [side, setSide] = useState<"now" | "day1">("now");
	const kind =
		side === "now" ? CheckpointItemKind.Outcome : CheckpointItemKind.Input;
	const items = checkpoint.items
		.filter((item) => item.kind === kind)
		.sort(byOrder);

	return (
		<section>
			<Flex align="center" gap={12} className={styles.sectionHead}>
				<SectionHeading
					level={4}
					title={t("advisor.verdict.goalCard", "Goal card")}
					className={styles.inlineHeading}
				/>
				<Segmented
					size="small"
					value={side}
					onChange={setSide}
					options={[
						{ value: "now", label: t("advisor.verdict.now", "Now") },
						{ value: "day1", label: t("advisor.verdict.day1", "On day 1") },
					]}
				/>
			</Flex>

			<Flex vertical gap={16} className={styles.goalBody}>
				<Flex vertical gap={4}>
					<Text type="secondary" className={styles.small}>
						{t("checkpoints.pay.goal", "The goal")}
					</Text>
					<Paragraph className={styles.goal}>{checkpoint.goal}</Paragraph>
				</Flex>

				<div>
					<Text type="secondary" className={styles.small}>
						{side === "now"
							? t("checkpoints.pay.whatMustExist", "What must exist by day 28")
							: t("advisor.verdict.whatExisted", "What existed on day 1")}
					</Text>
					{items.length === 0 ? (
						<Text type="secondary" className={styles.rowEmpty}>
							{t("checkpoints.goal.sideEmpty", "Nothing listed")}
						</Text>
					) : (
						items.map((item) =>
							side === "now" ? (
								<OutcomeRow key={item.id} item={item} />
							) : (
								<Flex
									key={item.id}
									align="center"
									gap={12}
									className={styles.row}
								>
									<IconPaperclip size={16} className={styles.muted} />
									<Text className={styles.rowText}>{item.text}</Text>
									{item.artifact ? (
										<ArtifactLink artifact={item.artifact} />
									) : (
										<Text type="secondary" className={styles.small}>
											{t("advisor.verdict.noArtifact", "No artifact")}
										</Text>
									)}
								</Flex>
							),
						)
					)}
				</div>
			</Flex>
		</section>
	);
}

function OutcomeRow({ item }: { item: CheckpointItemDto }) {
	const { t } = useTranslate();
	const proven = !item.cut && isProven(item);
	const Icon = item.cut
		? IconCircleMinus
		: proven
			? IconCircleCheck
			: IconCircle;

	return (
		<Flex align="center" gap={12} className={styles.row}>
			<Icon size={16} className={proven ? styles.success : styles.muted} />
			<Text className={clsx(styles.rowText, item.cut && styles.cut)}>
				{item.text}
			</Text>
			{item.cut ? (
				<StatusDot tone="warning" label={t("advisor.verdict.cut", "Cut")} />
			) : item.artifact ? (
				<Flex align="center" gap={8} className={styles.evidence}>
					<ArtifactLink artifact={item.artifact} />
					{proven && (
						<Text className={clsx(styles.small, styles.success)}>
							{t("advisor.verdict.proven", "· proven")}
						</Text>
					)}
				</Flex>
			) : (
				<Text type="secondary" className={styles.small}>
					{t("advisor.verdict.noEvidence", "No evidence attached")}
				</Text>
			)}
		</Flex>
	);
}

function LastBuild({
	checkpoint,
	build,
}: {
	checkpoint: AdvisorCheckpointDto;
	build: VerdictContextDto["lastBuild"];
}) {
	const { t } = useTranslate();

	return (
		<Section
			title={t("advisor.verdict.lastBuild", "Last build")}
			aside={
				build && (
					<Aside>
						{[
							t("advisor.verdict.uploaded", "Uploaded {date}", {
								date: dayjs(build.createdAt).format("D MMM"),
							}),
							checkpoint.startedAt
								? t("advisor.verdict.day", "day {n}", {
										n: dayNumberOn(
											new Date(checkpoint.startedAt),
											new Date(build.createdAt),
										),
									})
								: null,
						]
							.filter(Boolean)
							.join(" · ")}
					</Aside>
				)
			}
		>
			{build ? (
				<Flex align="center" gap={16} className={styles.build}>
					<IconTile icon={IconCube} size="md" />
					<Flex vertical gap={4} className={styles.rowText}>
						<Text strong ellipsis>
							{build.name ?? t("advisor.verdict.build", "Build")}
						</Text>
						{build.domain && (
							<Text type="secondary" className={styles.small}>
								{build.domain}
							</Text>
						)}
					</Flex>
					<Button
						href={build.link}
						target="_blank"
						icon={<IconExternalLink size={14} />}
						iconPlacement="end"
					>
						{t("advisor.verdict.openBuild", "Open the build")}
					</Button>
				</Flex>
			) : (
				<Text type="secondary" className={styles.rowEmpty}>
					{t(
						"advisor.verdict.noBuild",
						"No build was uploaded in these 28 days.",
					)}
				</Text>
			)}
		</Section>
	);
}

function Devlogs({ devlogs }: { devlogs: AdvisorProjectDto["devlogs"] }) {
	const { t } = useTranslate();
	const published = new Set(
		devlogs.flatMap((devlog) => (devlog.sprint ? [devlog.sprint] : [])),
	).size;

	return (
		<Section
			title={t("advisor.card.devlogs", "Devlogs")}
			aside={
				<Aside>
					{t("advisor.verdict.devlogsCount", "{n} of {total} published", {
						n: published,
						total: SPRINTS_PER_CHECKPOINT,
					})}
				</Aside>
			}
		>
			{devlogs.length === 0 ? (
				<Text type="secondary" className={styles.rowEmpty}>
					{t("advisor.verdict.noDevlogs", "No devlogs were published.")}
				</Text>
			) : (
				devlogs.map((devlog) => (
					<Flex
						key={devlog.id}
						align="center"
						gap={12}
						className={styles.devlog}
					>
						{devlog.sprint && (
							<Tag className={styles.sprintTag}>
								{t("checkpoints.signals.sprintShort", "S{n}", {
									n: devlog.sprint,
								})}
							</Tag>
						)}
						<Text ellipsis className={clsx(styles.rowText, styles.devlogTitle)}>
							{devlog.content.split("\n").find((line) => line.trim()) ?? ""}
						</Text>
						<Text className={styles.aside}>
							{dayjs(devlog.publishedAt).format("D MMM YYYY")}
						</Text>
					</Flex>
				))
			)}
		</Section>
	);
}

type Seat = AdvisorProjectDto["team"][number];

function TeamPulse({ team }: { team: AdvisorProjectDto["team"] }) {
	const { t } = useTranslate();
	const cells = team.flatMap((seat) => seat.pulse);
	const asked = cells.filter(
		(cell) => cell.state !== "notAsked" && cell.state !== "notOnTeam",
	).length;
	const confirmed = cells.filter((cell) => cell.state === "confirmed").length;

	return (
		<Section
			title={t("advisor.verdict.pulse", "Team pulse")}
			aside={
				<Aside>
					{t("advisor.verdict.pulseCount", "{confirmed} of {asked} confirmed", {
						confirmed,
						asked,
					})}
				</Aside>
			}
		>
			<Table<Seat>
				rowKey="id"
				size="small"
				pagination={false}
				className={styles.pulse}
				dataSource={team}
				locale={{
					emptyText: t(
						"advisor.project.teamEmpty",
						"Nobody has joined the team yet.",
					),
				}}
				columns={[
					{
						title: t("advisor.project.role", "Role"),
						key: "role",
						ellipsis: true,
						render: (_: unknown, seat: Seat) =>
							seat.position ?? seat.speciality?.name ?? "—",
					},
					...SPRINTS.map((sprint) => ({
						title: t("checkpoints.signals.sprintShort", "S{n}", { n: sprint }),
						key: `s${sprint}`,
						width: 44,
						align: "center" as const,
						render: (_: unknown, seat: Seat) =>
							seat.pulse.find((cell) => cell.sprint === sprint)?.state ===
							"confirmed" ? (
								<span className={styles.confirmed}>
									<IconCheck size={14} stroke={BOX_TICK_STROKE} />
								</span>
							) : (
								<span className={styles.muted}>—</span>
							),
					})),
				]}
			/>
		</Section>
	);
}

function VerdictForm({
	checkpoint,
	context,
	stages,
	onSent,
	admin,
}: {
	checkpoint: AdvisorCheckpointDto;
	context: VerdictContextDto;
	stages: { from: string; to: string } | null;
	onSent: () => void;
	admin?: AdminVerdict;
}) {
	const { t } = useTranslate();
	const { message, modal } = App.useApp();
	const { label, meaning } = useVerdictCopy();
	// Mounted once the context is in, so the draft seeds the form exactly once.
	const [verdict, setVerdict] = useState<CheckpointVerdict | null>(
		context.draft?.verdict ?? null,
	);
	const [note, setNote] = useState(context.draft?.note ?? "");
	const saveDraft = useSaveVerdictDraft(checkpoint.id);
	const send = useSendVerdict(checkpoint.id);
	const sender = admin ?? { send: send.mutateAsync, sending: send.isPending };

	const isSend = !!admin || context.stage === "send";
	const ready = !!verdict && note.trim().length > 0;
	const options = VERDICT_ORDER.filter(
		(option) => option !== CheckpointVerdict.StageClosed || stages,
	);

	const sendOpens = checkpoint.startedAt
		? dayjs(verdictSendOpensAt(checkpoint.startedAt, context.finalCall)).format(
				"D MMM",
			)
		: null;
	const dueBy = context.dueAt
		? formatShort(verdictDueBy(context.dueAt).toISOString())
		: null;

	const save = () =>
		saveDraft.mutate(
			{ verdict, note },
			{
				onSuccess: () =>
					message.success(t("advisor.verdict.draftSaved", "Draft saved")),
				onError: () =>
					message.error(
						t("advisor.verdict.draftFailed", "The draft was not saved"),
					),
			},
		);

	const confirmSend = () => {
		if (!verdict) return;

		modal.confirm({
			title: t(
				"advisor.verdict.confirm",
				"Send the verdict? It cannot be edited afterwards.",
			),
			okText: t("advisor.verdict.send", "Send the verdict"),
			cancelText: t("common.cancel", "Cancel"),
			onOk: async () => {
				try {
					await sender.send({ verdict, note });
					message.success(t("advisor.verdict.sent", "The verdict is sent"));
					onSent();
				} catch {
					message.error(
						t("advisor.verdict.sendFailed", "The verdict was not sent"),
					);
				}
			},
		});
	};

	const lockedReason = !isSend
		? t(
				"advisor.verdict.sendLocked",
				"Sending opens when the final call starts on {date}.",
				{ date: sendOpens ?? "—" },
			)
		: !ready
			? t(
					"advisor.verdict.sendIncomplete",
					"Choose a verdict and write your reasoning first.",
				)
			: null;

	const sendButton = (
		<Tooltip title={lockedReason}>
			<Button
				type={isSend ? "primary" : "default"}
				className={clsx(isSend && styles.grow)}
				disabled={!!lockedReason}
				icon={lockedReason ? <IconLock size={16} /> : undefined}
				loading={sender.sending}
				onClick={confirmSend}
			>
				{admin?.missed?.refund
					? t(
							"admin.checkpoints.verdict.submitWithRefund",
							"Send verdict and refund {amount}",
							{ amount: formatCheckpointMoney(admin.missed.refund) },
						)
					: t("advisor.verdict.send", "Send the verdict")}
			</Button>
		</Tooltip>
	);

	const saveButton = (
		<Button
			type={isSend ? "default" : "primary"}
			className={clsx(!isSend && styles.grow)}
			loading={saveDraft.isPending}
			onClick={save}
		>
			{t("advisor.verdict.saveDraft", "Save draft")}
		</Button>
	);

	return (
		<Flex vertical gap={16}>
			<Radio.Group
				value={verdict}
				onChange={(event) => setVerdict(event.target.value)}
				className={styles.options}
			>
				{options.map((option) => (
					<Radio
						key={option}
						value={option}
						classNames={{
							root: clsx(styles.option, verdict === option && styles.selected),
							label: styles.optionBody,
						}}
					>
						<Flex vertical gap={8}>
							<StatusDot
								tone={VERDICT_TONE[option]}
								label={label(option)}
								className={styles.optionLabel}
							/>
							<Text type="secondary" className={styles.caption}>
								{meaning(option, stages ?? undefined)}
							</Text>
						</Flex>
					</Radio>
				))}
			</Radio.Group>

			<Flex vertical gap={8}>
				<Flex justify="space-between" align="center" gap={8}>
					<Text>{t("advisor.verdict.reasoning", "Your reasoning")}</Text>
					<Text className={styles.counter}>
						{t("advisor.verdict.counter", "required · {n} / {max}", {
							n: note.length,
							max: VERDICT_NOTE_MAX,
						})}
					</Text>
				</Flex>
				<Input.TextArea
					value={note}
					onChange={(event) => setNote(event.target.value)}
					maxLength={VERDICT_NOTE_MAX}
					autoSize={{ minRows: 6, maxRows: 14 }}
				/>
			</Flex>

			<Text className={styles.caption}>
				{isSend
					? t(
							"advisor.verdict.finalNote",
							"Sending is final: the verdict cannot be edited afterwards.",
						)
					: [
							context.draft &&
								t(
									"advisor.verdict.draftNote",
									"Draft saved · {when}. Only you see it.",
									{ when: dayjs(context.draft.savedAt).format("D MMM, HH:mm") },
								),
							t(
								"advisor.verdict.windowNote",
								"Sending opens when the final call starts on {opens}; the verdict is due by {due}.",
								{ opens: sendOpens ?? "—", due: dueBy ?? "—" },
							),
						]
							.filter(Boolean)
							.join(" ")}
			</Text>

			{admin && (
				<div className={styles.missed}>
					<Text type="secondary">
						{admin.missed?.refund
							? t(
									"admin.checkpoints.verdict.refundLine",
									"Calls the curator never joined are refunded",
								)
							: t(
									"admin.checkpoints.verdict.nothingToRefund",
									"Every call was held — nothing to refund",
								)}
					</Text>
					{!!admin.missed?.refund && (
						<Text strong className={styles.missedValue}>
							{t(
								"admin.checkpoints.verdict.refundValue",
								"{parts} of {total} parts · {amount}",
								{
									parts: admin.missed.parts - admin.missed.provided,
									total: admin.missed.parts,
									amount: formatCheckpointMoney(admin.missed.refund),
								},
							)}
						</Text>
					)}
				</div>
			)}

			<Flex gap={8}>
				{sendButton}
				{!admin && saveButton}
			</Flex>
		</Flex>
	);
}
