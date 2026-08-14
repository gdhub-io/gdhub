"use client";

import { IconCopy } from "@tabler/icons-react";
import { App, Modal, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";
import { IconTile, StatusDot } from "@/components/ui";
import { auditActionMeta } from "@/config/audit-actions";
import { formatAuditValue, normalizeAuditChanges } from "@/helpers/audit";
import type { AuditLogRow } from "@/types/audit";
import { AuditPerson } from "../AuditPerson";
import styles from "./style.module.scss";

const { Text } = Typography;

type AuditEntryModalProps = {
	entry: AuditLogRow | null;
	onClose: () => void;
};

const Fact = ({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) => (
	<div className={styles.fact}>
		<Text type="secondary" className={styles.factKey}>
			{label}
		</Text>
		<div className={styles.factValue}>{children}</div>
	</div>
);

export function AuditEntryModal({ entry, onClose }: AuditEntryModalProps) {
	const { message } = App.useApp();
	const changes = useMemo(
		() => normalizeAuditChanges(entry?.changes),
		[entry?.changes],
	);

	if (!entry) return null;

	const meta = auditActionMeta(entry.action, entry.status);
	const hasMeta =
		!!entry.meta &&
		typeof entry.meta === "object" &&
		Object.keys(entry.meta as object).length > 0;

	const copy = (value: string, what: string) => {
		navigator.clipboard.writeText(value).then(
			() => message.success(`${what} copied`),
			() => message.error("Could not copy"),
		);
	};

	return (
		<Modal open width={680} footer={null} onCancel={onClose} destroyOnHidden>
			<div className={styles.header}>
				<IconTile icon={meta.icon} tint={meta.tint} ink={meta.ink} size="md" />
				<div className={styles.headerText}>
					<Text strong className={styles.title}>
						{meta.label} · {entry.entity}
					</Text>
					<Text type="secondary" className={styles.subtitle}>
						{dayjs(entry.createdAt).format("LLL")} ·{" "}
						{dayjs(entry.createdAt).fromNow()}
					</Text>
				</div>
				<StatusDot
					className={styles.headerStatus}
					tone={entry.status === "FAILED" ? "danger" : "success"}
					label={entry.status}
				/>
			</div>

			<section className={styles.section}>
				<Text type="secondary" className={styles.sectionTitle}>
					WHO &amp; WHERE
				</Text>
				<Fact label="Actor">
					<AuditPerson person={entry.actor} />
				</Fact>
				<Fact label="Subject">
					{entry.subject ? (
						<AuditPerson person={entry.subject} />
					) : (
						<Text type="secondary">—</Text>
					)}
				</Fact>
				<Fact label="Source">{entry.source ?? "unknown"}</Fact>
				{entry.requestId ? (
					<Fact label="Request ID">
						<code className={styles.mono}>{entry.requestId}</code>
					</Fact>
				) : null}
			</section>

			<section className={styles.section}>
				<Text type="secondary" className={styles.sectionTitle}>
					TARGET
				</Text>
				<div className={styles.targetCard}>
					<div className={styles.targetInfo}>
						<Text strong>{entry.entityLabel ?? "—"}</Text>
						<Text type="secondary" className={styles.targetEntity}>
							{entry.entity}
						</Text>
					</div>
					{entry.entityId ? (
						<button
							type="button"
							className={styles.iconButton}
							onClick={() => copy(entry.entityId as string, "Entity ID")}
							title="Copy entity ID"
						>
							<IconCopy size={15} />
						</button>
					) : null}
				</div>
				<Fact label="Entity ID">
					{entry.entityId ? (
						<code className={styles.mono}>{entry.entityId}</code>
					) : (
						<Text type="secondary">
							Cleared — the entity was erased with its owner&apos;s personal
							data
						</Text>
					)}
				</Fact>
			</section>

			<section className={styles.section}>
				<Text type="secondary" className={styles.sectionTitle}>
					WHAT CHANGED
				</Text>
				{changes.entries.length ? (
					<table className={styles.diff}>
						<thead>
							<tr>
								<th>FIELD</th>
								<th>BEFORE</th>
								<th>AFTER</th>
							</tr>
						</thead>
						<tbody>
							{changes.entries.map((change) => (
								<tr key={change.field}>
									<td>{change.field}</td>
									<td className={styles.diffValue}>
										{change.valueUnknown || !("from" in change) ? (
											<Text type="secondary">not recorded</Text>
										) : (
											formatAuditValue(change.from)
										)}
									</td>
									<td className={styles.diffValue}>
										{change.valueUnknown ? (
											<Text type="secondary">changed</Text>
										) : (
											formatAuditValue(change.to)
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<Text type="secondary">
						{changes.count !== undefined
							? `${changes.count} rows matched, no field values recorded`
							: "Nothing was recorded for this event."}
					</Text>
				)}
				{changes.entries.some((change) => change.valueUnknown) ? (
					<Text type="secondary" className={styles.hint}>
						Fields shown as &ldquo;changed&rdquo; are personal or off the audit
						allowlist — only the fact that they changed is stored.
					</Text>
				) : null}
				{changes.truncated ? (
					<Text type="secondary" className={styles.hint}>
						The write matched more rows than the log records ids for.
					</Text>
				) : null}
				{changes.version === null ? (
					<Text type="secondary" className={styles.hint}>
						Legacy entry: written before before/after values were recorded.
					</Text>
				) : null}
			</section>

			<section className={styles.section}>
				<div className={styles.sectionHeaderRow}>
					<Text type="secondary" className={styles.sectionTitle}>
						RAW PAYLOAD
					</Text>
					<button
						type="button"
						className={styles.textButton}
						onClick={() =>
							copy(
								JSON.stringify(
									{ changes: entry.changes, meta: entry.meta },
									null,
									2,
								),
								"Payload",
							)
						}
					>
						<IconCopy size={13} /> Copy
					</button>
				</div>
				<pre className={styles.json}>
					{JSON.stringify(entry.changes ?? {}, null, 2)}
				</pre>
				{hasMeta ? (
					<>
						<Text type="secondary" className={styles.sectionTitle}>
							META
						</Text>
						<pre className={styles.json}>
							{JSON.stringify(entry.meta, null, 2)}
						</pre>
					</>
				) : (
					<Text type="secondary" className={styles.hint}>
						META is empty.
					</Text>
				)}
			</section>
		</Modal>
	);
}
