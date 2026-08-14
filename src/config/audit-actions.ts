import {
	type Icon,
	IconAlertTriangle,
	IconPencil,
	IconPlus,
	IconShieldExclamation,
	IconShieldX,
	IconStack2,
	IconTrash,
} from "@tabler/icons-react";
import type { AuditAction } from "./prisma-enums";

export type AuditActionMeta = {
	label: string;
	icon: Icon;
	tint: string;
	ink: string;
};

const INFO = {
	tint: "var(--gd-info-tint)",
	ink: "var(--gd-info-on-tint)",
} as const;
const SUCCESS = {
	tint: "var(--gd-success-tint)",
	ink: "var(--gd-success-on-tint)",
} as const;
const DANGER = {
	tint: "var(--gd-danger-tint)",
	ink: "var(--gd-danger-on-tint)",
} as const;
const WARNING = {
	tint: "var(--gd-warning-tint)",
	ink: "var(--gd-warning-on-tint)",
} as const;

/**
 * How each `AuditAction` reads in the table. The raw enum name is a database
 * detail; the screen shows what happened.
 *
 * Keyed by the enum so a value added to the schema fails the build here rather
 * than rendering as "Unknown" in production.
 */
export const AUDIT_ACTION_META: Record<AuditAction, AuditActionMeta> = {
	CREATE: { label: "Created", icon: IconPlus, ...SUCCESS },
	UPDATE: { label: "Updated", icon: IconPencil, ...INFO },
	UPSERT: { label: "Saved", icon: IconPencil, ...INFO },
	DELETE: { label: "Deleted", icon: IconTrash, ...DANGER },
	CREATE_MANY: { label: "Bulk create", icon: IconStack2, ...SUCCESS },
	UPDATE_MANY: { label: "Bulk update", icon: IconStack2, ...INFO },
	DELETE_MANY: { label: "Bulk delete", icon: IconStack2, ...DANGER },
	ACCESS_DENIED: { label: "Denied", icon: IconShieldX, ...DANGER },
	ACCESS_OVERRIDE: {
		label: "Override",
		icon: IconShieldExclamation,
		...WARNING,
	},
};

const UNKNOWN: AuditActionMeta = {
	label: "Unknown",
	icon: IconAlertTriangle,
	...WARNING,
};

/**
 * A failed write keeps its action but reads as the failure, which is the news.
 *
 * Takes a plain `string`, not the enum: the value comes out of the database and
 * a row written by an older schema must still render.
 */
export const auditActionMeta = (
	action: string,
	status: "OK" | "FAILED",
): AuditActionMeta => {
	const meta =
		(AUDIT_ACTION_META as Record<string, AuditActionMeta>)[action] ?? UNKNOWN;
	if (status !== "FAILED") return meta;

	return {
		...meta,
		label: `${meta.label} failed`,
		icon: IconAlertTriangle,
		...DANGER,
	};
};
