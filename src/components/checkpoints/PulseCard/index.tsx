"use client";

import {
	IconActivityHeartbeat,
	IconCheck,
	IconCircleCheck,
	IconClockOff,
	IconInfoCircle,
	IconMinus,
} from "@tabler/icons-react";
import { T, useTranslate } from "@tolgee/react";
import { App, Button, Flex, Typography } from "antd";
import { isAxiosError } from "axios";
import clsx from "clsx";
import type { ReactNode } from "react";
import { useState } from "react";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import { PulseCell } from "@/components/checkpoints/PulseCell";
import { IconTile, ViewAllLink } from "@/components/ui";
import { useConfirmPulse } from "@/hooks/checkpoints";
import type { PulseViewDto } from "@/repositories/checkpoint-pulse";
import styles from "./style.module.scss";

const { Text, Title, Paragraph } = Typography;

type Cell = PulseViewDto["cells"][number];

function Strip({ view, animate }: { view: PulseViewDto; animate: boolean }) {
	const { t } = useTranslate();
	const first = view.cells[0]?.sprint;

	const label = (cell: Cell) => {
		if (cell.sprint > view.sprint) return t("pulse.cell.ahead", "Not yet");
		if (cell.state === "confirmed")
			return t("pulse.cell.confirmed", "Confirmed");
		if (cell.state === "waiting")
			return t("pulse.cell.waiting", "Waiting for your answer");
		if (cell.state === "missed") return t("pulse.cell.missed", "Missed");
		return t("pulse.cell.notAsked", "Not asked");
	};

	return (
		<Flex vertical align="center" gap={8} className={styles.strip}>
			<Text type="secondary" className={styles.stripTitle}>
				{t("pulse.strip.title", "Your pulse in this checkpoint")}
			</Text>
			<Flex justify="center" gap={12}>
				{view.cells.map((cell) => {
					const own = cell.sprint === view.sprint;
					const ahead = cell.sprint > view.sprint;

					return (
						<Flex
							key={cell.sprint}
							vertical
							align="center"
							gap={4}
							className={styles.col}
						>
							<PulseCell
								state={cell.state}
								role="img"
								aria-label={label(cell)}
								className={clsx(
									styles.cell,
									ahead && styles.ahead,
									!ahead && cell.state === "notAsked" && styles.empty,
									cell.state === "missed" && styles.missed,
									own && cell.state === "waiting" && styles.ownWaiting,
									own && cell.state === "confirmed" && styles.ownConfirmed,
									own && animate && styles.landed,
								)}
							>
								{cell.state === "missed" ? <IconMinus size={14} /> : undefined}
							</PulseCell>
							<Text
								className={clsx(
									styles.sprint,
									ahead && styles.sprintAhead,
									own && styles.sprintOwn,
									own && cell.state === "waiting" && styles.sprintWaiting,
								)}
							>
								{t("pulse.strip.sprint", "Sprint {sprint}", {
									sprint: cell.sprint,
								})}
							</Text>
						</Flex>
					);
				})}
			</Flex>
			{first && first > 1 && (
				<Text type="secondary" className={styles.stripTitle}>
					{t("pulse.strip.joined", "You joined the team in Sprint {sprint}", {
						sprint: first,
					})}
				</Text>
			)}
		</Flex>
	);
}

function Head({
	tile,
	kicker,
	title,
}: {
	tile: ReactNode;
	kicker: string;
	title: ReactNode;
}) {
	return (
		<Flex vertical align="center" gap={12}>
			{tile}
			<Text type="secondary" className={styles.kicker}>
				{kicker}
			</Text>
			<Title level={2} className={styles.title}>
				{title}
			</Title>
		</Flex>
	);
}

export type PulseCardProps = {
	/** Null when the token does not resolve: shown the same as an expired link. */
	view: PulseViewDto | null;
	token: string;
};

/**
 * Frames 09.1–09.3: the page a pulse letter links to. It asks one question
 * and answers it in place; opening it never records anything.
 */
export function PulseCard({ view: initial, token }: PulseCardProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [view, setView] = useState(initial);
	// Only an answer given here animates — a confirmed page loads still.
	const [answered, setAnswered] = useState(false);
	const confirm = useConfirmPulse(token);

	const onConfirm = () =>
		confirm.mutate(undefined, {
			onSuccess: (next) => {
				setView(next);
				setAnswered(true);
			},
			onError: (error) => {
				if (isAxiosError(error) && error.response?.status === 404)
					setView(null);
				else message.error(t("pulse.error", "Could not save — try again"));
			},
		});

	if (!view || view.state === "closed")
		return (
			<Flex vertical align="center" gap={24} className={styles.card}>
				<Head
					tile={<IconTile icon={IconClockOff} size="md" />}
					kicker={t("pulse.closed.kicker", "Pulse link")}
					title={t("pulse.closed.title", "This link no longer works")}
				/>
				<Paragraph type="secondary" className={styles.text}>
					{t(
						"pulse.closed.text",
						"A pulse can be answered until the sprint’s next call. This one has passed, or the link was changed on the way.",
					)}
				</Paragraph>
				<ViewAllLink href="/" label={t("pulse.closed.open", "Open GDHub")} />
			</Flex>
		);

	const project = view.project.name;

	if (view.state === "confirmed")
		return (
			<Flex vertical align="center" gap={24} className={styles.card}>
				<Head
					tile={
						<IconTile
							icon={IconCircleCheck}
							size="md"
							tint="var(--gd-success-tint)"
							ink="var(--gd-success-solid)"
						/>
					}
					kicker={t(
						"pulse.kickerSprint",
						"{project} · Checkpoint {number} · Sprint {sprint}",
						{ project, number: view.number, sprint: view.sprint },
					)}
					title={
						view.firstName
							? t("pulse.confirmed.title", "Thanks, {name} — noted", {
									name: view.firstName,
								})
							: t("pulse.confirmed.titleNoName", "Thanks — noted")
					}
				/>
				<Paragraph type="secondary" className={styles.text}>
					{t(
						"pulse.confirmed.text",
						"You are marked as working on {project} in Sprint {sprint}. Opening this link again changes nothing.",
						{ project, sprint: view.sprint },
					)}
				</Paragraph>
				{view.cells.length > 0 && <Strip view={view} animate={answered} />}
				<ViewAllLink
					href={`/project/${view.project.slug}`}
					label={t("pulse.confirmed.open", "Open {project}", { project })}
				/>
			</Flex>
		);

	return (
		<Flex vertical align="center" gap={24} className={styles.card}>
			<Flex vertical align="center" gap={12}>
				<Head
					tile={
						<IconTile
							icon={IconActivityHeartbeat}
							size="md"
							tint="var(--gd-color-accent-subtle)"
							ink="var(--gd-color-accent)"
						/>
					}
					kicker={t("pulse.kicker", "{project} · Checkpoint {number}", {
						project,
						number: view.number,
					})}
					title={
						<T
							keyName="pulse.open.title"
							defaultValue="Were you working on <accent>{project}</accent> this sprint?"
							params={{
								project,
								accent: (chunks: ReactNode) => (
									<span className={styles.accent}>{chunks}</span>
								),
							}}
						/>
					}
				/>
				<Text strong className={styles.period}>
					{t("pulse.period", "Sprint {sprint} · {dates}", {
						sprint: view.sprint,
						dates: dayRange(view.from, view.to),
					})}
				</Text>
			</Flex>
			<Paragraph type="secondary" className={styles.text}>
				{t(
					"pulse.open.text",
					"Saying yes marks you in the team’s pulse, which your curator reads at the next call.",
				)}
			</Paragraph>
			{view.cells.length > 0 && <Strip view={view} animate={false} />}
			<Button
				type="primary"
				size="large"
				block
				icon={<IconCheck size={20} />}
				loading={confirm.isPending}
				onClick={onConfirm}
			>
				{t("pulse.open.confirm", "Yes, I was")}
			</Button>
			<Flex gap={8} className={styles.hint}>
				<IconInfoCircle size={16} className={styles.hintIcon} />
				<Text type="secondary" className={styles.hintText}>
					{t(
						"pulse.open.hint",
						"If you weren’t working on it this sprint, just close this page. Nothing is recorded.",
					)}
				</Text>
			</Flex>
		</Flex>
	);
}
