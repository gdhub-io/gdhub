"use client";

import { IconCheck, IconPlus } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Select } from "antd";
import type { EntryProjectDto } from "@/types/checkpoints";
import { ProjectOption } from "./ProjectOption";
import styles from "./ProjectPicker.module.scss";

export type ProjectPickerProps = {
	projects: EntryProjectDto[];
	value?: string;
	onChange: (projectId: string) => void;
	onNewProject: () => void;
	/** The chosen project's lines are being read: the picker waits for them. */
	loading?: boolean;
};

/**
 * Which project the checkpoint is for (12.2 / 12.2a): cover, name and stage in
 * the list and in the chosen value alike, with "New project" beside it rather
 * than inside the list, because creating one is a dialog of its own.
 */
export function ProjectPicker({
	projects,
	value,
	onChange,
	onNewProject,
	loading,
}: ProjectPickerProps) {
	const { t } = useTranslate();

	const byId = new Map(projects.map((project) => [project.id, project]));

	return (
		<div className={styles.row}>
			<Select
				className={styles.picker}
				variant="filled"
				value={value}
				onChange={onChange}
				loading={loading}
				disabled={loading}
				placeholder={t("checkpointEntry.project.pick", "Choose a project")}
				// A project with a checkpoint under way cannot be headed for again until it closes.
				options={projects.map((project) => ({
					value: project.id,
					label: project.name,
					disabled: project.running,
				}))}
				optionRender={({ value: id }) => {
					const project = byId.get(id as string);
					if (!project) return null;
					return (
						<span className={styles.option}>
							<ProjectOption project={project} />
							{id === value && <IconCheck size={16} className={styles.tick} />}
						</span>
					);
				}}
				labelRender={({ value: id, label }) => {
					const project = byId.get(id as string);
					return project ? <ProjectOption project={project} /> : label;
				}}
			/>
			<Button icon={<IconPlus size={16} />} onClick={onNewProject}>
				{t("checkpoints.now.newProject", "New project")}
			</Button>
		</div>
	);
}
