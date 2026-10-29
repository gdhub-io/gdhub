import { useTranslate } from "@tolgee/react";
import type { StatusDotProps } from "@/components/ui";
import type { Standing } from "@/lib/checkpoints/verdict";

/**
 * The label an outcome's evidence standing carries (frame 12.07.4). Delivered
 * and nothing attached carry none: the row's own icon says it.
 */
export function useStandingStatus() {
	const { t } = useTranslate();

	return (standing: Standing): StatusDotProps | undefined => {
		switch (standing.is) {
			case "unproven":
				if (standing.reason === "missing") return undefined;
				return {
					tone: "danger",
					label:
						standing.reason === "broken"
							? t(
									"workflow.path.checkpoint.evidence.broken",
									"Link doesn't open",
								)
							: t(
									"workflow.path.checkpoint.evidence.doesNotMatch",
									"Not about the task",
								),
				};
			case "trusted":
				return {
					tone: "warning",
					label: t("workflow.path.checkpoint.evidence.trusted", "On trust"),
				};
			case "partly":
				return {
					tone: "warning",
					label: t("workflow.path.checkpoint.evidence.partly", "Partly"),
				};
			default:
				return undefined;
		}
	};
}
