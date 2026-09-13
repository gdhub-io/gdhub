import { CheckpointCuratorKind } from "@gdhub-io/gdhub-prisma";
import { IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import { AppAvatar } from "@/components/ui/AppAvatar";
import styles from "./style.module.scss";

export type CuratorBadgeProps = {
	kind: CheckpointCuratorKind;
	curator?: { name: string | null; image: string | null } | null;
	className?: string;
};

/**
 * Who ran the checkpoint. One component for both kinds, because a scout reading
 * a project has to be able to tell at a glance which stages a person closed and
 * which the model did — that comparison only works if they sit in the same slot.
 */
export function CuratorBadge({ kind, curator, className }: CuratorBadgeProps) {
	const { t } = useTranslate();

	if (kind === CheckpointCuratorKind.AI) {
		return (
			<Flex align="center" gap={8} className={className}>
				<span className={styles.aiTile}>
					<IconSparkles size={14} stroke={1.6} />
				</span>
				<Typography.Text className={styles.name}>
					{t("checkpoints.curator.ai", "AI curator")}
				</Typography.Text>
			</Flex>
		);
	}

	return (
		<Flex align="center" gap={8} className={className}>
			<AppAvatar size={22} src={curator?.image ?? undefined}>
				{curator?.name?.[0]}
			</AppAvatar>
			<Typography.Text className={styles.name} ellipsis>
				{curator?.name}
			</Typography.Text>
		</Flex>
	);
}
