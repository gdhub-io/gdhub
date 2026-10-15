"use client";

import { IconChevronLeft } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Tag, Typography } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import callStyles from "@/components/checkpoints/CallRoom/style.module.scss";
import { StatusDot, type StatusTone } from "@/components/ui";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import styles from "./style.module.scss";

export type CuratorHeaderProps = {
	backHref: string;
	/** Who curates: a tag beside the title, on its own colour. */
	kind: CheckpointCuratorKind;
	subtitle: string;
	status?: { tone: StatusTone; label: string };
	actions?: ReactNode;
};

/**
 * Frame DjZqC: one title for pro and ai. The kind names what the curator is,
 * so it is the theme's one chip (ui-guidelines §3), opening the line under it.
 */
export function CuratorHeader({
	backHref,
	kind,
	subtitle,
	status,
	actions,
}: CuratorHeaderProps) {
	const { t } = useTranslate();

	return (
		<div className={callStyles.header}>
			<div className={callStyles.headerLead}>
				<Link href={backHref}>
					<Button
						type="text"
						aria-label={t("common.back", "Back")}
						icon={<IconChevronLeft size={20} />}
					/>
				</Link>
				<div className={callStyles.titles}>
					<div className={callStyles.titleRow}>
						<Typography.Title level={2} className={callStyles.title}>
							{t("checkpoints.review.pageTitle", "Curator's Review")}
						</Typography.Title>
						{status && <StatusDot tone={status.tone} label={status.label} />}
					</div>
					<Flex align="center" gap={8} wrap>
						<Tag className="gd-tag-on-page">
							{kind === CheckpointCuratorKind.AI
								? t("checkpoints.review.kindAi", "AI")
								: t("checkpoints.review.kindPro", "Pro")}
						</Tag>
						<Typography.Text className={callStyles.subtitle}>
							{subtitle}
						</Typography.Text>
					</Flex>
				</div>
			</div>
			{actions && (
				<Flex gap={8} align="center" wrap>
					{actions}
				</Flex>
			)}
		</div>
	);
}
