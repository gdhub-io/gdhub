import { IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import styles from "./style.module.scss";

export type CuratorBadgeProps = {
	kind: CheckpointCuratorKind;
	curator?: { name: string | null; image: string | null } | null;
	className?: string;
};

/**
 * Who ran the checkpoint. One component for both kinds, because a scout reading
 * a project has to tell at a glance which stages a person closed and which the
 * model did — and that comparison only works if they sit in the same slot.
 */
export function CuratorBadge({ kind, curator, className }: CuratorBadgeProps) {
	const { t } = useTranslate();
	const isAI = kind === CheckpointCuratorKind.AI;

	return (
		<span className={`${styles.badge}${className ? ` ${className}` : ""}`}>
			{isAI ? (
				<span className={styles.tile}>
					<IconSparkles size={15} stroke={1.6} />
				</span>
			) : (
				<AppAvatar size={26} src={curator?.image ?? undefined}>
					{curator?.name?.[0]}
				</AppAvatar>
			)}
			<Typography.Text className={styles.name} ellipsis>
				{isAI ? t("checkpoints.curator.ai", "AI curator") : curator?.name}
			</Typography.Text>
		</span>
	);
}
