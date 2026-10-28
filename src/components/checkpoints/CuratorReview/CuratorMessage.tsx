"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Typography } from "antd";
import type { ReactNode } from "react";
import { initials } from "@/components/checkpoints/CallRoom/CallParts";
import {
	useVerdictCopy,
	VERDICT_TONE,
} from "@/components/checkpoints/VerdictChip";
import { InverseBand, StatusDot } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AI_CURATOR_AVATAR } from "@/config/checkpoint";
import type { CheckpointVerdict } from "@/config/prisma-enums";
import styles from "./style.module.scss";

export type CuratorAction = {
	key: string;
	label: string;
	icon?: ReactNode;
	primary?: boolean;
	loading?: boolean;
	disabled?: boolean;
	onClick?: () => void;
};

export type CuratorMessageProps = {
	/** A pro curator; without one the AI curator speaks. */
	curator?: { name: string; image: string | null };
	/** Who the AI curator plays on this checkpoint, if anyone. */
	character?: { name: string; avatar: string | null } | null;
	/** Already formatted: "8 Oct". */
	date: string;
	message: string;
	verdict?: CheckpointVerdict | null;
	/** Under the message: the countdown to a call. */
	extra?: ReactNode;
	actions?: CuratorAction[];
};

/**
 * Frame wVnbo: the curator speaks first, where a call shows its video — the
 * AI with what it read and thinks, a pro before and after a call (08.8, 08.9)
 * — and the buttons for what it asks.
 */
export function CuratorMessage({
	curator,
	character,
	date,
	message,
	verdict,
	extra,
	actions = [],
}: CuratorMessageProps) {
	const { t } = useTranslate();
	const { label } = useVerdictCopy();

	return (
		<InverseBand density="product" className={styles.message}>
			{curator ? (
				<AppAvatar src={curator.image} size={48}>
					{initials(curator.name)}
				</AppAvatar>
			) : (
				<AppAvatar src={character?.avatar ?? AI_CURATOR_AVATAR} size={48} />
			)}
			<div className={styles.body}>
				<div className={styles.head}>
					<Typography.Text strong>
						{curator
							? t("checkpoints.review.proCurator", "{name} · curator", {
									name: curator.name,
								})
							: character
								? t("checkpoints.review.aiCharacter", "{name} · AI curator", {
										name: character.name,
									})
								: t("checkpoints.review.curator", "AI curator")}
					</Typography.Text>
					<Typography.Text type="secondary" className={styles.small}>
						{date}
					</Typography.Text>
				</div>
				{verdict && (
					<div className={styles.verdict}>
						<Typography.Text type="secondary" className={styles.small}>
							{t("checkpoints.review.verdict", "Verdict")}
						</Typography.Text>
						<StatusDot tone={VERDICT_TONE[verdict]} label={label(verdict)} />
					</div>
				)}
				<Typography.Paragraph className={styles.text}>
					{message}
				</Typography.Paragraph>
				{extra}
				{actions.length > 0 && (
					<div className={styles.actions}>
						{actions.map((action) => (
							<Button
								key={action.key}
								type={action.primary ? "primary" : "default"}
								icon={action.icon}
								loading={action.loading}
								disabled={action.disabled}
								onClick={action.onClick}
							>
								{action.label}
							</Button>
						))}
					</div>
				)}
			</div>
		</InverseBand>
	);
}
