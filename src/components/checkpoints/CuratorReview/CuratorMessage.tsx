"use client";

import { IconSparkles } from "@tabler/icons-react";
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
import type { CheckpointVerdict } from "@/config/prisma-enums";
import styles from "./style.module.scss";

export type CuratorAction = {
	key: string;
	label: string;
	icon?: ReactNode;
	primary?: boolean;
	loading?: boolean;
	onClick: () => void;
};

export type CuratorMessageProps = {
	/** A pro curator; without one the AI curator speaks. */
	curator?: { name: string; image: string | null };
	/** Already formatted: "8 Oct". */
	date: string;
	message: string;
	verdict?: CheckpointVerdict | null;
	actions?: CuratorAction[];
};

/**
 * Frame wVnbo: the curator speaks first, where a call shows its video — the
 * AI with what it read and thinks, a pro before and after a call (08.8, 08.9)
 * — and the buttons for what it asks.
 */
export function CuratorMessage({
	curator,
	date,
	message,
	verdict,
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
				<span className={styles.avatar}>
					<IconSparkles size={22} />
				</span>
			)}
			<div className={styles.body}>
				<div className={styles.head}>
					<Typography.Text strong>
						{curator
							? t("checkpoints.review.proCurator", "{name} · curator", {
									name: curator.name,
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
				{actions.length > 0 && (
					<div className={styles.actions}>
						{actions.map((action) => (
							<Button
								key={action.key}
								type={action.primary ? "primary" : "default"}
								icon={action.icon}
								loading={action.loading}
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
