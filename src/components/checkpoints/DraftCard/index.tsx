"use client";

import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useTolgee, useTranslate } from "@tolgee/react";
import { Button, Dropdown, Flex, Typography } from "antd";
import Link from "next/link";
import { type DraftPiece, draftMissing } from "@/lib/checkpoint-draft";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointStatusSlot } from "../CheckpointStatusSlot";
import styles from "./style.module.scss";

export type DraftCardProps = {
	checkpoint: CheckpointDto;
	projectSlug: string;
	onDiscard: (id: string) => void;
	discarding?: boolean;
};

/**
 * A checkpoint still being bought — frame `NYbvl`.
 *
 * It is deliberately not the running card with empty fields: there is no goal to
 * quote and no day to count, so the card carries the one sentence that says what
 * is left and the one button that goes back to it. Discarding is in the menu
 * because it is the rare half of the pair, and a draft is meant to be finished.
 */
export function DraftCard({
	checkpoint,
	projectSlug,
	onDiscard,
	discarding,
}: DraftCardProps) {
	const { t } = useTranslate();
	const { getLanguage } = useTolgee();

	const label: Record<DraftPiece, string> = {
		goal: t("checkpoints.draft.missing.goal", "a goal"),
		curator: t("checkpoints.draft.missing.curator", "curator"),
		startDate: t("checkpoints.draft.missing.startDate", "start date"),
	};

	const missing = draftMissing(checkpoint);
	// "a goal, curator and start date" — the conjunction and the commas are the
	// language's, not ours.
	const pieces = new Intl.ListFormat(getLanguage() || "en", {
		type: "conjunction",
	}).format(missing.map((piece) => label[piece]));

	return (
		<section className={styles.card}>
			<header className={styles.head}>
				<Flex gap={12} align="center">
					{/* Numbered like any other: the count runs through the project, and
					    a draft blocks a second one from being started until it is done. */}
					<Typography.Text className={styles.title}>
						{t("checkpoints.number", "Checkpoint {number}", {
							number: checkpoint.order,
						})}
					</Typography.Text>
					<CheckpointStatusSlot checkpoint={checkpoint} />
				</Flex>

				<Dropdown
					trigger={["click"]}
					menu={{
						items: [
							{
								key: "discard",
								danger: true,
								icon: <IconTrash size={16} stroke={1.6} />,
								label: t("checkpoints.draft.discard", "Discard draft"),
								disabled: discarding,
							},
						],
						onClick: () => onDiscard(checkpoint.id),
					}}
				>
					<Button
						type="text"
						loading={discarding}
						icon={<IconDotsVertical size={18} stroke={1.6} />}
						aria-label={t("checkpoints.draft.more", "More")}
					/>
				</Dropdown>
			</header>

			<div className={styles.body}>
				<Typography.Text type="secondary" className={styles.missing}>
					{missing.length
						? t("checkpoints.draft.add", "Add {pieces}.", { pieces })
						: t(
								"checkpoints.draft.readyToPay",
								"Everything is answered — only the payment is left.",
							)}
				</Typography.Text>

				<Link
					href={`/user/project/${projectSlug}/checkpoints/${checkpoint.id}`}
				>
					<Button type="primary">
						{t("checkpoints.draft.continue", "Continue setup")}
					</Button>
				</Link>
			</div>
		</section>
	);
}
