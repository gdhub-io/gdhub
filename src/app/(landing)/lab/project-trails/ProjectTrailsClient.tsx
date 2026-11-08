"use client";

import { IconCalendar, IconFocusCentered } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Divider, Flex, Typography } from "antd";
import Link from "next/link";
import { useRef } from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-logo.svg";
import { ExperimentalTag } from "@/components/checkpoints/ExperimentalTag";
import {
	ProjectTrailsGraph,
	type ProjectTrailsGraphHandle,
} from "@/components/project/ProjectTrailsGraph";
import { InverseBand } from "@/components/ui/InverseBand";
import { TRAILS_WINDOW_DAYS } from "@/config/project-trails";
import type { ProjectTrailDto } from "@/types/project-trails";
import styles from "./style.module.scss";

export function ProjectTrailsClient({ paths }: { paths: ProjectTrailDto[] }) {
	const { t } = useTranslate();
	const graphRef = useRef<ProjectTrailsGraphHandle>(null);

	return (
		<InverseBand density="product" className={styles.screen}>
			<ProjectTrailsGraph ref={graphRef} paths={paths} />
			<Flex align="center" justify="space-between" className={styles.header}>
				<Flex align="center" gap={16}>
					<Link href="/" className={styles.logo}>
						<GdhubLogo />
					</Link>
					<Divider orientation="vertical" className={styles.divider} />
					<Flex align="center" gap={12}>
						<Typography.Text className={styles.title}>
							{t("lab.projectTrails.title", "Project Trails")}
						</Typography.Text>
						<ExperimentalTag variant="outlined" />
					</Flex>
				</Flex>
				<Flex align="center" gap={6} className={styles.window}>
					<IconCalendar size={16} />
					<Typography.Text type="secondary">
						{t("lab.projectTrails.window", "Last {days} days", {
							days: TRAILS_WINDOW_DAYS,
						})}
					</Typography.Text>
				</Flex>
				<Flex align="center" gap={8}>
					{paths.length > 0 && (
						<Button
							type="text"
							icon={<IconFocusCentered size={16} />}
							onClick={() => graphRef.current?.fitView()}
						>
							{t("lab.projectTrails.fitView", "Fit view")}
						</Button>
					)}
					<Link href="/">
						<Button type="text">
							{t("lab.projectTrails.home", "Go to home")}
						</Button>
					</Link>
				</Flex>
			</Flex>
		</InverseBand>
	);
}
