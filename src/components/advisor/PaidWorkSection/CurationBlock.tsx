"use client";

import { IconLock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Flex,
	Form,
	Select,
	Switch,
	Tooltip,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { StatusDot } from "@/components/ui";
import type { CurationDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

const { Text } = Typography;

/** Frames `S5YkC` / `JPpKq` / `Q8dNW0`: the switch, the stages and one curator status. */
export function CurationBlock({
	curation,
	askingAgain,
	onAskAgain,
}: {
	curation: CurationDto;
	askingAgain?: boolean;
	onAskAgain: () => Promise<unknown>;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const lockedReason = t(
		"advisor.settings.paid-work.curator.locked-payout",
		"Save your payout details first",
	);
	const notOffered = t(
		"advisor.settings.paid-work.curator.notOffered",
		"You're not offered to authors until GDHub approves you.",
	);
	const day = (date: string | null) =>
		date ? dayjs(date).format("D MMM") : "";

	const askAgain = async () => {
		try {
			await onAskAgain();
		} catch {
			message.error(
				t(
					"advisor.settings.paid-work.curator.saveFailed",
					"Couldn't save project curation. Try again.",
				),
			);
		}
	};

	return (
		<div className={styles.curation}>
			<Flex justify="space-between" align="center" gap={12}>
				<Text
					className={curation.locked ? styles.rowTitleLocked : styles.rowTitle}
				>
					{t("advisor.settings.paid-work.projectCuration", "Project curation")}
				</Text>
				<Tooltip title={curation.locked ? lockedReason : undefined}>
					<Flex align="center" gap={8}>
						{curation.locked && (
							<IconLock size={14} className={styles.lockIcon} />
						)}
						<Form.Item name="curationOn" valuePropName="checked" noStyle>
							<Switch
								disabled={curation.locked}
								aria-label={t(
									"advisor.settings.paid-work.projectCuration",
									"Project curation",
								)}
							/>
						</Form.Item>
					</Flex>
				</Tooltip>
			</Flex>

			<Form.Item
				name="curationStages"
				label={t(
					"advisor.settings.paid-work.curator.stages",
					"Stages you curate",
				)}
				className={styles.item}
			>
				<Select
					mode="multiple"
					disabled={curation.locked}
					placeholder={t(
						"advisor.settings.paid-work.curator.stagesPlaceholder",
						"Select stages",
					)}
					options={curation.stageOptions.map((stage) => ({
						value: stage,
						label: stage,
					}))}
				/>
			</Form.Item>

			{curation.status === "pending" && (
				<Flex vertical gap={4}>
					<StatusDot
						tone="warning"
						className={styles.statusLabel}
						label={t(
							"advisor.settings.paid-work.curator.pending",
							"Waiting for review · sent {date}",
							{ date: day(curation.requestedAt) },
						)}
					/>
					<Text type="secondary" className={styles.note}>
						{notOffered}
					</Text>
				</Flex>
			)}

			{curation.status === "approved" && (
				<Flex vertical gap={4}>
					<StatusDot
						tone="success"
						className={styles.statusLabel}
						label={t(
							"advisor.settings.paid-work.curator.approved",
							"Approved · {date}",
							{ date: day(curation.approvedAt) },
						)}
					/>
					{/* With the switch off the approval stays, but nobody is offered them. */}
					{curation.on && (
						<Text type="secondary" className={styles.note}>
							{t(
								"advisor.settings.paid-work.curator.offered",
								"Authors are offered you at these stages.",
							)}
						</Text>
					)}
				</Flex>
			)}

			{curation.status === "notApproved" && (
				<Flex vertical gap={4} align="flex-start">
					<StatusDot
						tone="neutral"
						className={styles.statusLabel}
						label={t(
							"advisor.settings.paid-work.curator.notApproved",
							"Not approved",
						)}
					/>
					{curation.note && (
						<Text type="secondary" className={styles.note}>
							“{curation.note}”
						</Text>
					)}
					<Text type="secondary" className={styles.note}>
						{notOffered}
					</Text>
					<Button
						type="link"
						loading={askingAgain}
						onClick={askAgain}
						className={styles.askAgain}
					>
						{t("advisor.settings.paid-work.curator.askAgain", "Ask again")}
					</Button>
				</Flex>
			)}
		</div>
	);
}
