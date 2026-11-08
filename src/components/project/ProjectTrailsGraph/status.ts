import { useTranslate } from "@tolgee/react";
import { brand, neutral, semantic } from "@/config/design";
import { amber } from "@/config/design/tokens";
import type { ProjectTrailStatus } from "@/types/project-trails";

export const TRAIL_STATUS_COLOR: Record<ProjectTrailStatus, string> = {
	inProgress: brand[500],
	released: semantic.success.solid,
	abandoned: neutral[400],
	cancelled: semantic.danger.solid,
};

export const CHECKPOINT_COLOR = amber[400];
export const SIGNAL_COLOR = amber[100];

export const useTrailStatusLabels = (): Record<ProjectTrailStatus, string> => {
	const { t } = useTranslate();
	return {
		inProgress: t("lab.projectTrails.status.inProgress", "In progress"),
		released: t("lab.projectTrails.status.released", "Released"),
		abandoned: t("lab.projectTrails.status.abandoned", "Dormant"),
		cancelled: t("lab.projectTrails.status.cancelled", "Cancelled"),
	};
};
