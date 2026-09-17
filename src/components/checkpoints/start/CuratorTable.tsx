"use client";

import { IconId } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Radio, Table, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import SpecialistPreviewModal from "@/components/modals/SpecialistPreviewModal";
import {
	CHECKPOINT_PRICE_CURRENCY,
	curatorPrice,
} from "@/config/checkpoint-pricing";
import { useCheckpointCurators } from "@/hooks/checkpoints";
import type { CheckpointCurator } from "@/repositories/checkpoint-curators";
import { CuratorRow } from "./CuratorRow";
import styles from "./CuratorTable.module.scss";

export type CuratorTableProps = {
	/** The curator picked so far, by user id. */
	value?: string | null;
	onChange: (userId: string) => void;
};

/**
 * The list a curator is picked from — frame `eFLO0`.
 *
 * One table, used by the purchase and by the replacement after a curator turns
 * a checkpoint down: choosing the first time and choosing again are the same
 * decision, and a second list of the same people with different columns would
 * read as a different set of people.
 *
 * A table without a head: the rows are the same few facts each time, and a
 * header over unlabelled columns would name nothing the eye does not already
 * have. Pressing anywhere on a row picks it; the radio on the right is where
 * the answer lands.
 */
export function CuratorTable({ value, onChange }: CuratorTableProps) {
	const { t } = useTranslate();
	const curators = useCheckpointCurators();
	const [preview, setPreview] = useState<string>();

	const talentCard = t("checkpoints.curator.talentCard", "Talent card");

	return (
		<>
			<Table<CheckpointCurator>
				showHeader={false}
				pagination={false}
				// Without it the name column grows with the longest summary and
				// pushes the price, the talent card and the radio past the edge.
				tableLayout="fixed"
				loading={curators.isLoading}
				rowKey="userId"
				size="middle"
				className={styles.people}
				dataSource={curators.data ?? []}
				onRow={(row: CheckpointCurator) => ({
					onClick: () => onChange(row.userId),
				})}
				rowClassName={(row: CheckpointCurator) =>
					value === row.userId ? styles.chosen : ""
				}
				locale={{
					emptyText: t(
						"checkpoints.curator.noneOpen",
						"Nobody is taking checkpoints at the moment. The AI curator runs these 28 days, or the draft waits until someone is.",
					),
				}}
				columns={
					[
						{
							key: "who",
							render: (_: unknown, row: CheckpointCurator) => (
								<CuratorRow curator={row} />
							),
						},
						{
							key: "price",
							width: 128,
							align: "right",
							render: (_: unknown, row: CheckpointCurator) => (
								<Typography.Text className={styles.price}>
									{t("checkpoints.curator.amount", "{currency}{price}", {
										currency: CHECKPOINT_PRICE_CURRENCY,
										price: curatorPrice(row.level),
									})}
								</Typography.Text>
							),
						},
						{
							key: "talent",
							width: 64,
							align: "center",
							render: (_: unknown, row: CheckpointCurator) => (
								// Choosing a curator and reading about one are different
								// intentions, so the row carries both.
								<Tooltip title={talentCard}>
									<Button
										type="text"
										aria-label={talentCard}
										className={styles.talent}
										icon={<IconId size={18} stroke={1.6} />}
										onClick={(event) => {
											event.stopPropagation();
											setPreview(row.specialityId);
										}}
									/>
								</Tooltip>
							),
						},
						{
							key: "pick",
							width: 48,
							align: "center",
							render: (_: unknown, row: CheckpointCurator) => (
								<Radio
									checked={value === row.userId}
									onChange={() => onChange(row.userId)}
								/>
							),
						},
					] satisfies ColumnsType<CheckpointCurator>
				}
			/>

			<SpecialistPreviewModal
				withOffer={false}
				specialistId={preview}
				open={!!preview}
				onCancel={() => setPreview(undefined)}
			/>
		</>
	);
}
