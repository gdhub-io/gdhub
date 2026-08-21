"use client";

import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";

type ViewsErrorPanelProps = {
	onRetry: () => void;
	/** Slotted under the empty state — the page adds an error reference there. */
	children?: ReactNode;
};

/** The one failure message on the screen: the report and the table share it. */
export function ViewsErrorPanel({ onRetry, children }: ViewsErrorPanelProps) {
	const { t } = useTranslate();

	return (
		<>
			<EmptyState
				icon={IconAlertTriangle}
				tint="var(--gd-danger-tint)"
				ink="var(--gd-danger-solid)"
				title={t("admin.views.error.title", "Views could not be loaded")}
				description={t(
					"admin.views.error.description",
					"The request failed before any counts came back. Nothing was lost — the numbers are still being recorded.",
				)}
				action={
					<Button
						type="primary"
						icon={<IconRefresh size={16} />}
						onClick={onRetry}
					>
						{t("admin.views.error.retry", "Try again")}
					</Button>
				}
			/>
			{children}
		</>
	);
}
