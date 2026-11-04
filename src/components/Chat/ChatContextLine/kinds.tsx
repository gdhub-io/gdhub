import dayjs from "dayjs";
import type { ReactNode } from "react";
import { StatusDot } from "@/components/ui";
import { TalentName } from "./TalentName";

type Translate = (
	key: string,
	fallback: string,
	params?: Record<string, string>,
) => string;

export type ChatContextField = {
	label: string;
	value: ReactNode;
	/** "half" fields pack two or three to a row; default "full". */
	span?: "half" | "full";
};

export type ChatContextAction = {
	key: string;
	label: string;
	onClick?: () => void;
	/** The committing action; at most one. */
	primary?: boolean;
	/** Navigation, opened in a new tab. */
	href?: string;
};

/** What one chat kind contributes to the context disclosure. */
export type ChatContextSlot = {
	tag: string;
	/** Collapsed line text, truncated by CSS. */
	summary: string;
	closed: boolean;
	fields: ChatContextField[];
	/** Empty → no action row. */
	actions: ChatContextAction[];
};

/** `GET /api/chat/rooms/[id]` as the panel receives it. */
export type RoomContext = {
	type: string;
	data: Record<string, unknown> | null;
	canClose?: boolean;
};

type AdviceData = {
	topic?: string | null;
	comment?: string | null;
	status?: string;
	finishedAt?: string | null;
	project?: { name?: string | null } | null;
};

type VacancyData = {
	status?: string;
	finishedAt?: string | null;
	appliedAt?: string | null;
	vacancy?: { id?: string; title?: string | null } | null;
	project?: { name?: string | null } | null;
};

type CheckpointData = {
	number?: number;
	status?: string;
	startedAt?: string | null;
	dueAt?: string | null;
	sprint?: { number: number; from: string; to: string } | null;
	curator?: { name?: string | null; specialityId?: string | null } | null;
	author?: { name?: string | null; specialityId?: string | null } | null;
	project?: { name?: string | null; slug?: string | null } | null;
};

type SlotOptions = {
	t: Translate;
	/** A pending invite shows no mutating actions. */
	invited: boolean;
	onClose: () => void;
};

const dash = (value?: string | null) => value || "—";
const day = (value?: string | null) =>
	value ? dayjs(value).format("D MMM YYYY") : "";

function statusField(
	t: Translate,
	closed: boolean,
	closedLabel: string,
): ChatContextField {
	return {
		label: t("chat.context.status", "Status"),
		span: "half",
		value: (
			<StatusDot
				tone={closed ? "neutral" : "success"}
				label={closed ? closedLabel : t("chat.context.open", "Open")}
			/>
		),
	};
}

function adviceSlot(
	context: RoomContext,
	{ t, invited, onClose }: SlotOptions,
): ChatContextSlot {
	const data = (context.data ?? {}) as AdviceData;
	const closed = data.status?.toLowerCase() === "closed";
	const project = dash(data.project?.name);

	return {
		tag: t("chat.kind.advice", "Advice"),
		summary: t("chat.context.advice.summary", "Topic: {topic} · {project}", {
			topic: dash(data.topic),
			project,
		}),
		closed,
		fields: [
			{
				label: t("chat.context.advice.project", "Project"),
				value: project,
				span: "half",
			},
			statusField(
				t,
				closed,
				data.finishedAt
					? t("chat.context.advice.resolvedOn", "Resolved {date}", {
							date: day(data.finishedAt),
						})
					: t("chat.context.closed", "Closed"),
			),
			{
				label: t("chat.context.advice.topic", "Topic"),
				value: dash(data.topic),
			},
			{
				label: t("chat.context.advice.comment", "Comment"),
				value: dash(data.comment),
			},
		],
		actions:
			!closed && !invited && context.canClose
				? [
						{
							key: "resolve",
							label: t("chat.context.advice.resolve", "Question resolved"),
							primary: true,
							onClick: onClose,
						},
					]
				: [],
	};
}

function vacancySlot(
	context: RoomContext,
	{ t, invited, onClose }: SlotOptions,
): ChatContextSlot {
	const data = (context.data ?? {}) as VacancyData;
	const closed = data.status?.toLowerCase() === "closed";
	const position = dash(data.vacancy?.title);
	const project = dash(data.project?.name);
	const vacancyId = data.vacancy?.id;
	const actions: ChatContextAction[] = [];
	if (vacancyId) {
		actions.push({
			key: "open",
			label: t("chat.context.vacancy.openPosition", "Open position page"),
			href: `/job/${vacancyId}`,
		});
	}
	if (!closed && !invited && context.canClose) {
		actions.push({
			key: "close",
			label: t("chat.context.vacancy.close", "Close chat"),
			onClick: onClose,
		});
	}

	return {
		tag: t("chat.kind.offer", "Offer"),
		summary: `${position} · ${project}`,
		closed,
		fields: [
			{
				label: t("chat.context.vacancy.position", "Position"),
				value: position,
			},
			{
				label: t("chat.context.vacancy.project", "Project"),
				value: project,
				span: "half",
			},
			...(data.appliedAt
				? [
						{
							label: t("chat.context.vacancy.applied", "Applied"),
							value: day(data.appliedAt),
							span: "half" as const,
						},
					]
				: []),
			statusField(t, closed, t("chat.context.closed", "Closed")),
		],
		actions,
	};
}

const span = (from?: string | null, to?: string | null) =>
	from && to ? `${dayjs(from).format("D MMM")} – ${day(to)}` : "—";

function checkpointSlot(
	context: RoomContext,
	{ t }: SlotOptions,
): ChatContextSlot {
	const data = (context.data ?? {}) as CheckpointData;
	const dates = span(data.startedAt, data.dueAt);
	const closed = data.status === "Closed" || data.status === "Cancelled";

	// The project is the chat's own name, so the line says which checkpoint and when.
	return {
		tag: t("chat.kind.checkpoint", "Checkpoint"),
		summary: `#${data.number ?? 1} · ${dates}`,
		closed,
		fields: [
			{
				label: t("chat.context.checkpoint.dates", "Dates"),
				value: dates,
			},
			{
				label: t("chat.context.checkpoint.sprint", "Current sprint"),
				value: data.sprint
					? t(
							"chat.context.checkpoint.sprintValue",
							"Sprint {number} · {dates}",
							{
								number: String(data.sprint.number),
								dates: span(data.sprint.from, data.sprint.to),
							},
						)
					: "—",
			},
			{
				label: t("chat.context.checkpoint.author", "Author"),
				value: (
					<TalentName
						name={dash(data.author?.name)}
						specialityId={data.author?.specialityId}
					/>
				),
				span: "half",
			},
			{
				label: t("chat.context.checkpoint.curator", "Curator"),
				value: (
					<TalentName
						name={dash(data.curator?.name)}
						specialityId={data.curator?.specialityId}
					/>
				),
				span: "half",
			},
		],
		actions: data.project?.slug
			? [
					{
						key: "project",
						label: t(
							"chat.context.checkpoint.openProject",
							"Open project page",
						),
						href: `/project/${data.project.slug}`,
					},
				]
			: [],
	};
}

const KINDS: Record<
	string,
	(context: RoomContext, options: SlotOptions) => ChatContextSlot
> = {
	"advice-request": adviceSlot,
	"vacancy-application": vacancySlot,
	checkpoint: checkpointSlot,
};

/** `null` for kinds without a context line — direct chats. */
export function contextSlot(
	context: RoomContext | null | undefined,
	options: SlotOptions,
): ChatContextSlot | null {
	const build = context && KINDS[context.type];
	return build ? build(context, options) : null;
}
