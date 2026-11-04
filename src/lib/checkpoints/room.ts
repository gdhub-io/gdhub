import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";

/**
 * The project room is there for calls with a person, during the 28 days they
 * curate. An AI curator holds no calls, and outside a running checkpoint there
 * is nobody to meet — so no tab, no page and no button.
 */
export const opensRoom = (
	checkpoint?: {
		status: CheckpointStatus;
		curatorKind: CheckpointCuratorKind;
	} | null,
): boolean =>
	checkpoint?.status === CheckpointStatus.Active &&
	checkpoint.curatorKind === CheckpointCuratorKind.Human;
