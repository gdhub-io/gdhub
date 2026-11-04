"use client";

import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import { useState } from "react";
import { AppImage } from "@/components/ui";
import type { EntryProjectDto } from "@/types/checkpoints";
import styles from "./ProjectOption.module.scss";

export type ProjectCoverProps = {
	cover: string | null;
	size: 20 | 40;
};

/** The project's cover, or a gamepad on a neutral square where it has none or it fails to load. */
export function ProjectCover({ cover, size }: ProjectCoverProps) {
	const [failed, setFailed] = useState<string | null>(null);
	const showImage = !!cover && failed !== cover;

	return (
		<span className={styles.cover} data-size={size}>
			{showImage ? (
				<AppImage
					src={cover}
					alt=""
					fill
					sizes={`${size}px`}
					onError={() => setFailed(cover)}
				/>
			) : (
				<IconDeviceGamepad2 size={size === 40 ? 20 : 14} />
			)}
		</span>
	);
}

export type ProjectOptionProps = {
	project: Pick<EntryProjectDto, "name" | "cover" | "stage" | "running">;
};

/** One project in the picker, both in the list and as the chosen value. */
export function ProjectOption({ project }: ProjectOptionProps) {
	const { t } = useTranslate();

	return (
		<span className={styles.option}>
			<ProjectCover cover={project.cover} size={40} />
			<span className={styles.text}>
				<Typography.Text className={styles.name} ellipsis>
					{project.name}
				</Typography.Text>
				{project.running ? (
					<Typography.Text className={styles.stage} ellipsis>
						{t("checkpointEntry.project.underWay", "Checkpoint under way")}
					</Typography.Text>
				) : (
					project.stage && (
						<Typography.Text className={styles.stage} ellipsis>
							{t("checkpoints.now.stage", "{stage} stage", {
								stage: project.stage,
							})}
						</Typography.Text>
					)
				)}
			</span>
		</span>
	);
}
