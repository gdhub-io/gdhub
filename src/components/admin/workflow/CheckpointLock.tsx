"use client";

import { Alert } from "antd";
import axios from "axios";
import dayjs from "dayjs";

/** The checkpoint a refused workflow edit names (dialog `rhKOo`). */
export type CheckpointLock = {
	number: number;
	stageName: string;
	dueAt: string | null;
};

export const checkpointLockOf = (error: unknown): CheckpointLock | null =>
	axios.isAxiosError(error) &&
	error.response?.status === 409 &&
	error.response.data?.error === "checkpointRunning"
		? (error.response.data.details as CheckpointLock)
		: null;

export const checkpointLockTitle = "This project is heading for a checkpoint";

export const checkpointLockText = (lock: CheckpointLock) =>
	`Checkpoint ${lock.number} · ${lock.stageName}${
		lock.dueAt
			? ` runs until ${dayjs.utc(lock.dueAt).format("D MMM YYYY")}`
			: " is running"
	}. Nothing was changed — wait for the verdict, or resolve the checkpoint first.`;

export function CheckpointLockAlert({ lock }: { lock: CheckpointLock }) {
	return (
		<Alert
			type="warning"
			showIcon
			title={checkpointLockTitle}
			description={checkpointLockText(lock)}
		/>
	);
}
