"use client";

import { IconArrowRight, IconMinus, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Empty, Flex, Modal, Skeleton, Typography } from "antd";
import axios from "axios";
import type { LocalChange } from "@/services/workflow/diffFromTemplate";
import styles from "./WorkflowDifferencesModal.module.scss";

const { Text } = Typography;

export type DifferencesTarget = { id: string; projectName: string };

/**
 * What this project changed about its copy of the workflow.
 *
 * The list is the same one the editor shows and the reset modal warns about —
 * one server-side diff, so the three cannot disagree about what would be lost.
 */
export function WorkflowDifferencesModal({
	target,
	onClose,
}: {
	target: DifferencesTarget | null;
	onClose: () => void;
}) {
	const { data, isFetching } = useQuery({
		queryKey: ["admin", "project-workflow", target?.id],
		queryFn: () =>
			axios.get(`/api/admin/project-workflow/${target?.id}`).then(
				(res) =>
					res.data as {
						localChanges: LocalChange[];
						template: { name: string; title: string | null } | null;
					} | null,
			),
		enabled: Boolean(target),
	});

	const changes = data?.localChanges ?? [];

	return (
		<Modal
			open={Boolean(target)}
			onCancel={onClose}
			footer={null}
			width={560}
			centered
			destroyOnHidden
			title={
				<Flex vertical gap={2}>
					<span>Differences from the template</span>
					<Text type="secondary" className={styles.subtitle}>
						{target?.projectName}
						{data?.template
							? ` · ${data.template.title ?? data.template.name}`
							: ""}
					</Text>
				</Flex>
			}
		>
			{isFetching && !data ? (
				<Skeleton active paragraph={{ rows: 3 }} title={false} />
			) : changes.length === 0 ? (
				<Empty
					image={Empty.PRESENTED_IMAGE_SIMPLE}
					description="This workflow still matches its template."
				/>
			) : (
				<Flex vertical gap={8}>
					{changes.map((change) => (
						<Flex
							align="flex-start"
							gap={8}
							key={change.text}
							className={styles.change}
						>
							{change.kind === "added" && (
								<IconPlus size={14} className={styles.added} />
							)}
							{change.kind === "removed" && (
								<IconMinus size={14} className={styles.removed} />
							)}
							{change.kind === "moved" && (
								<IconArrowRight size={14} className={styles.moved} />
							)}
							<span>{change.text}</span>
						</Flex>
					))}
				</Flex>
			)}
		</Modal>
	);
}

export default WorkflowDifferencesModal;
