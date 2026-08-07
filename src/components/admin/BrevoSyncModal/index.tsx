"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Modal, Skeleton, Typography } from "antd";
import axios from "axios";
import styles from "./style.module.scss";

const { Text } = Typography;

type SyncPreview = {
	list: { id: number; name: string };
	total: number;
	toCreate: number;
	toUpdate: number;
	unsupportedValues: {
		attribute: string;
		value: string;
		userCount: number;
	}[];
};

/**
 * What the sync writes, and where each value comes from.
 *
 * Spelled out in the dialog rather than left to the docs: the button rewrites
 * contacts in the mailing platform, and an admin should be able to see the
 * blast radius before pressing it.
 */
const SYNCED_FIELDS: [attribute: string, source: string][] = [
	["FIRSTNAME", "Profile name, or the account name"],
	["MAIN_INTEREST", "Primary interest"],
	["DIRECTIONS", "First speciality direction"],
	["LEVEL", "First speciality level"],
	["ONBOARDING_DONE", "Onboarding flag"],
	["HAS_SUBSCRIBE_TO_NEWSLETTER", "Newsletter agreement"],
];

export type BrevoSyncSubject = {
	name: string;
	email: string | null;
	/** Already in the list — the sync updates rather than adds. */
	inBrevo?: boolean;
};

export type BrevoSyncModalProps = {
	open: boolean;
	/** One person, or every user when omitted. */
	subject?: BrevoSyncSubject | null;
	/** Fallback for the confirm button until the preview arrives. */
	userCount?: number;
	loading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

export function BrevoSyncModal({
	open,
	subject,
	userCount,
	loading,
	onConfirm,
	onCancel,
}: BrevoSyncModalProps) {
	// Reading Brevo's contact list is not free, so it happens when the dialog
	// opens rather than on every page render. The single-user dialog asks for the
	// same thing — it needs the list name, and the server cache makes the repeat
	// call cheap.
	const { data: preview, isPending: isPreviewPending } = useQuery({
		queryKey: ["admin", "brevo-sync-preview"],
		queryFn: () =>
			axios.get<SyncPreview>("/api/admin/users/brevo-sync").then((r) => r.data),
		enabled: open,
		refetchOnWindowFocus: false,
		staleTime: 60_000,
	});

	const total = preview?.total ?? userCount;
	const listName = preview?.list.name;

	return (
		<Modal
			open={open}
			title={
				subject
					? `Sync ${subject.name} with Brevo?`
					: "Sync all users with Brevo?"
			}
			onCancel={onCancel}
			footer={[
				<Button key="cancel" onClick={onCancel} disabled={loading}>
					Cancel
				</Button>,
				<Button
					key="confirm"
					type="primary"
					loading={loading}
					icon={<IconRefresh size={15} />}
					onClick={onConfirm}
				>
					{subject
						? "Sync this user"
						: total
							? `Sync ${total} users`
							: "Sync all users"}
				</Button>,
			]}
		>
			<Text type="secondary">
				The app is the source of truth: the attributes below are overwritten
				with what GDHub holds. Nothing else about the contact is touched.
			</Text>

			<div className={styles.target}>
				<span className={styles.targetLabel}>Contacts land in the list</span>
				{listName ? (
					<span className={styles.targetName}>
						{listName}{" "}
						<span className={styles.targetId}>#{preview?.list.id}</span>
					</span>
				) : (
					<Skeleton.Input active size="small" style={{ width: 140 }} />
				)}
			</div>

			{subject ? (
				<div className={styles.counts}>
					<div className={styles.count}>
						<span className={styles.countValue}>
							{subject.inBrevo ? "Update" : "Add"}
						</span>
						<span className={styles.countLabel}>
							{subject.email ?? "no email — nothing to sync"}
						</span>
					</div>
				</div>
			) : isPreviewPending ? (
				<Skeleton active title={false} paragraph={{ rows: 2, width: "100%" }} />
			) : preview ? (
				<div className={styles.counts}>
					<div className={styles.count}>
						<span className={styles.countValue}>{preview.toCreate}</span>
						<span className={styles.countLabel}>
							not in the list yet — will be added
						</span>
					</div>
					<div className={styles.count}>
						<span className={styles.countValue}>{preview.toUpdate}</span>
						<span className={styles.countLabel}>
							already there — attributes rewritten
						</span>
					</div>
				</div>
			) : null}

			<dl className={styles.fields}>
				{SYNCED_FIELDS.map(([attribute, source]) => (
					<div key={attribute} className={styles.field}>
						<dt className={styles.attribute}>{attribute}</dt>
						<dd className={styles.source}>{source}</dd>
					</div>
				))}
			</dl>

			{preview?.unsupportedValues.length ? (
				<Alert
					className={styles.warning}
					type="warning"
					showIcon
					message="Brevo will drop some values"
					description={
						<>
							<span>
								MAIN_INTEREST and LEVEL are category attributes: Brevo only
								stores labels that exist in their list, and refuses the rest
								without an error. Add these in Brevo → Contacts → Attributes,
								then sync.
							</span>
							<ul className={styles.warningList}>
								{preview.unsupportedValues.map((item) => (
									<li key={`${item.attribute}:${item.value}`}>
										<code>{item.attribute}</code> = {item.value} —{" "}
										{item.userCount} {item.userCount === 1 ? "user" : "users"}
									</li>
								))}
							</ul>
						</>
					}
				/>
			) : null}
		</Modal>
	);
}

export default BrevoSyncModal;
