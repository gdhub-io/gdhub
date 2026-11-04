"use client";

import { useTranslate } from "@tolgee/react";
import { Alert } from "antd";
import { useEffect, useState } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

const seenKey = (id: string) => `gd:curator-accepted:${id}`;

/**
 * Frame 07 (`I1NIp`): the curator took the checkpoint on. Said once — closing
 * it is remembered in this browser, and it stops on its own after the first call.
 */
export function CuratorAccepted({ checkpoint }: { checkpoint: CheckpointDto }) {
	const { t } = useTranslate();
	const [hidden, setHidden] = useState(true);

	const due =
		checkpoint.curatorKind === CheckpointCuratorKind.Human &&
		!!checkpoint.curator &&
		!!checkpoint.curatorAcceptedAt &&
		!checkpoint.sessions?.[0]?.endedAt;

	useEffect(() => {
		if (!due) return;
		try {
			setHidden(!!localStorage.getItem(seenKey(checkpoint.id)));
		} catch {
			setHidden(false);
		}
	}, [due, checkpoint.id]);

	if (!due || hidden || !checkpoint.curator) return null;

	const close = () => {
		setHidden(true);
		try {
			localStorage.setItem(seenKey(checkpoint.id), "1");
		} catch {}
	};

	return (
		<Alert
			type="success"
			showIcon
			className={styles.accepted}
			icon={
				<AppAvatar src={checkpoint.curator.image} size={40}>
					{checkpoint.curator.name?.[0]}
				</AppAvatar>
			}
			title={t(
				"workflow.path.accepted.title",
				"{name} agreed to work with you",
				{ name: checkpoint.curator.name ?? "" },
			)}
			description={t(
				"workflow.path.accepted.sub",
				"Your first call with them opens Sprint 1.",
			)}
			closable
			onClose={close}
		/>
	);
}
