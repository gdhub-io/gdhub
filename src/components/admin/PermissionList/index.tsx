"use client";

import { Checkbox, Typography } from "antd";
import { humanizeFeature } from "@/config/permissions/role-meta";
import styles from "./style.module.scss";

const { Text } = Typography;

export type PermissionFeature = {
	feature: string;
	permissions: { permission: string; action: string }[];
};

type Props = {
	features: PermissionFeature[];
	selected: Set<string>;
	onToggle: (permission: string, checked: boolean) => void;
	/** Permissions that were on when the modal opened, to mark what changed. */
	initial?: Set<string>;
	disabled?: boolean;
	/** Added to the scroll box — use it to override how tall the list may grow. */
	className?: string;
};

/**
 * The permission catalogue of one space, grouped by feature. The full
 * `space.feature.action` string stays visible next to every checkbox — it is
 * what the code checks and what ends up in the audit log, so the person ticking
 * the box should be looking at the same string.
 *
 * The list scrolls inside its own box: a space catalogue easily outgrows any
 * modal, and the counter, the reset link and the footer have to stay reachable.
 */
export const PermissionList = ({
	features,
	selected,
	onToggle,
	initial,
	disabled,
	className,
}: Props) => (
	<div className={className ? `${styles.list} ${className}` : styles.list}>
		{features.map(({ feature, permissions }) => (
			<div key={feature} className={styles.group}>
				<div className={styles.groupHeader}>
					<Text strong className={styles.feature}>
						{feature}
					</Text>
					<Text type="secondary" className={styles.featureHint}>
						· {humanizeFeature(feature)}
					</Text>
				</div>
				{permissions.map(({ permission, action }) => {
					const checked = selected.has(permission);
					const changed = initial ? initial.has(permission) !== checked : false;

					return (
						<Checkbox
							key={permission}
							className={
								changed ? `${styles.row} ${styles.rowChanged}` : styles.row
							}
							checked={checked}
							disabled={disabled}
							onChange={(event) => onToggle(permission, event.target.checked)}
						>
							<span className={styles.action}>{action}</span>
							<Text type="secondary" className={styles.full}>
								{permission}
							</Text>
							{changed ? (
								<span className={styles.changed}>
									{checked ? "added" : "removed"}
								</span>
							) : null}
						</Checkbox>
					);
				})}
			</div>
		))}
	</div>
);
