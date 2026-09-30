import { Button } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";

type Translate = (
	key: string,
	fallback: string,
	params?: Record<string, string>,
) => string;

/** What one chat kind contributes to the context line and its popover. */
export type ChatContextSlot = {
	tag: string;
	/** Collapsed line text, truncated by CSS. */
	summary: string;
	status: "open" | "closed";
	/** Popover title status, e.g. "Resolved 18 Sep". */
	statusLabel?: string;
	title: string;
	fields: { label: string; value: ReactNode }[];
	/** Popover footer, right-aligned; empty → no footer. */
	actions: ReactNode[];
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

type SlotOptions = {
	t: Translate;
	/** A pending invite shows no mutating actions. */
	invited: boolean;
	onClose: () => void;
};

const dash = (value?: string | null) => value || "—";
const day = (value?: string | null) =>
	value ? dayjs(value).format("D MMM YYYY") : undefined;

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
		status: closed ? "closed" : "open",
		statusLabel:
			closed && data.finishedAt
				? t("chat.context.advice.resolvedOn", "Resolved {date}", {
						date: day(data.finishedAt) ?? "",
					})
				: undefined,
		title: t("chat.context.advice.title", "Advice request"),
		fields: [
			{
				label: t("chat.context.advice.topic", "Topic"),
				value: dash(data.topic),
			},
			{ label: t("chat.context.advice.project", "Project"), value: project },
			{
				label: t("chat.context.advice.comment", "Comment"),
				value: dash(data.comment),
			},
		],
		actions:
			!closed && !invited && context.canClose
				? [
						<Button key="resolve" type="primary" size="small" onClick={onClose}>
							{t("chat.context.advice.resolve", "Question resolved")}
						</Button>,
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

	return {
		tag: t("chat.kind.offer", "Offer"),
		summary: `${position} · ${project}`,
		status: closed ? "closed" : "open",
		statusLabel: closed ? day(data.finishedAt) : undefined,
		title: t("chat.context.vacancy.title", "Vacancy offer"),
		fields: [
			{
				label: t("chat.context.vacancy.position", "Position"),
				value: position,
			},
			{ label: t("chat.context.vacancy.project", "Project"), value: project },
			...(data.appliedAt
				? [
						{
							label: t("chat.context.vacancy.applied", "Applied"),
							value: day(data.appliedAt),
						},
					]
				: []),
		],
		actions: [
			vacancyId && (
				<Button
					key="open"
					size="small"
					href={`/job/${vacancyId}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					{t("chat.context.vacancy.openPosition", "Open position page")}
				</Button>
			),
			!closed && !invited && context.canClose && (
				<Button key="close" size="small" onClick={onClose}>
					{t("chat.context.vacancy.close", "Close chat")}
				</Button>
			),
		].filter(Boolean),
	};
}

const KINDS: Record<
	string,
	(context: RoomContext, options: SlotOptions) => ChatContextSlot
> = {
	"advice-request": adviceSlot,
	"vacancy-application": vacancySlot,
};

/** `null` for kinds without a context line — direct chats. */
export function contextSlot(
	context: RoomContext | null | undefined,
	options: SlotOptions,
): ChatContextSlot | null {
	const build = context && KINDS[context.type];
	return build ? build(context, options) : null;
}
