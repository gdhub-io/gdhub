"use client";

import { IconDeviceGamepad2, IconLock, IconPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button, Form, Skeleton, Tooltip } from "antd";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
	DONE_SO_FAR_FIELD,
	DoneSoFar,
	type DoneSoFarRow,
	EMPTY_DONE_ROW,
} from "@/components/checkpoints/entry/DoneSoFar";
import { ENTRY_HUB_HREF } from "@/components/checkpoints/entry/EntryHub";
import { EntryShell } from "@/components/checkpoints/entry/EntryShell";
import { ProjectPicker } from "@/components/checkpoints/entry/ProjectPicker";
import CreateProjectModal, {
	type CreatedProject,
} from "@/components/modals/CreateProjectModal";
import { EmptyState } from "@/components/ui";
import {
	entryKeys,
	useEntryPrefill,
	useEntryStatus,
	useSaveEntryProject,
} from "@/hooks/checkpoint-entry";
import type { EntryStatusDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

type ProjectValues = { [DONE_SO_FAR_FIELD]: DoneSoFarRow[] };

/** Item 2 (12.2 – 12.2c): the project, and what is already done on it. */
export function ProjectClient() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [form] = Form.useForm<ProjectValues>();

	const status = useEntryStatus();
	const save = useSaveEntryProject();

	const [projectId, setProjectId] = useState<string>();
	const [creating, setCreating] = useState(false);

	const projects = status.data?.projects ?? [];
	const available = projects.filter((project) => !project.running);

	// The draft's project first, then the most recent one — never one already under way.
	useEffect(() => {
		if (projectId || !status.data) return;
		const open = status.data.projects.filter((project) => !project.running);
		const draftId = status.data.draft?.projectId;
		setProjectId(
			open.find((project) => project.id === draftId)?.id ?? open[0]?.id,
		);
	}, [projectId, status.data]);

	const prefill = useEntryPrefill(projectId);

	// Applied once per project, so a background refetch never wipes what is being typed.
	const appliedFor = useRef<string>(undefined);
	useEffect(() => {
		if (!projectId || !prefill.data || appliedFor.current === projectId) return;
		appliedFor.current = projectId;
		form.setFieldsValue({
			[DONE_SO_FAR_FIELD]: prefill.data.items.length
				? prefill.data.items.map(({ text, artifact }) => ({ text, artifact }))
				: [{ ...EMPTY_DONE_ROW }],
		});
	}, [projectId, prefill.data, form]);

	const rows = Form.useWatch(DONE_SO_FAR_FIELD, form) ?? [];
	const filled = rows.filter((row) => row?.text?.trim());
	const switching = !!projectId && prefill.isFetching;

	const blocked = !projectId
		? t("checkpoints.now.createFirst", "Create a project first")
		: !filled.length
			? t("checkpointEntry.done.required", "Add at least one thing that's done")
			: undefined;

	const onCreated = (project: CreatedProject) => {
		setCreating(false);
		queryClient.setQueryData<EntryStatusDto>(entryKeys.status, (current) =>
			current
				? {
						...current,
						projects: [
							{
								id: project.id,
								slug: project.slug,
								name: project.name,
								cover: project.coverImage ?? null,
								stage: project.stage,
								running: false,
							},
							...current.projects,
						],
					}
				: current,
		);
		queryClient.invalidateQueries({ queryKey: entryKeys.status });
		setProjectId(project.id);
	};

	const submit = async () => {
		if (!projectId || blocked) return;

		try {
			await save.mutateAsync({
				projectId,
				items: filled.map((row) => ({
					text: row.text.trim(),
					artifactId: row.artifact?.id ?? null,
				})),
			});
			router.push(ENTRY_HUB_HREF);
		} catch (error) {
			message.error(
				isAxiosError(error) && error.response?.status === 409
					? t(
							"checkpointEntry.project.running",
							"This project already has a checkpoint under way.",
						)
					: t("checkpointEntry.project.failed", "Could not save — try again"),
			);
		}
	};

	const saveButton = (
		<Button
			type="primary"
			loading={save.isPending}
			disabled={!!blocked}
			icon={blocked ? <IconLock size={16} /> : undefined}
			onClick={submit}
		>
			{t("checkpointEntry.saveBack", "Save and go back")}
		</Button>
	);

	const body = () => {
		if (status.isPending)
			return <Skeleton active paragraph={{ rows: 5 }} title={false} />;

		if (!available.length)
			return (
				<div className={styles.empty}>
					<EmptyState
						size="compact"
						icon={IconDeviceGamepad2}
						title={
							projects.length
								? t(
										"checkpointEntry.project.allRunning",
										"Every project has a checkpoint under way",
									)
								: t("checkpoints.now.noProject", "You have no project yet")
						}
						description={
							projects.length
								? t(
										"checkpointEntry.project.allRunningHint",
										"Create a new project to head for another checkpoint.",
									)
								: t(
										"checkpoints.now.noProjectHint",
										"A checkpoint is reached with a project — create one to head for it.",
									)
						}
						action={
							<Button
								type="primary"
								icon={<IconPlus size={16} />}
								onClick={() => setCreating(true)}
							>
								{t("checkpoints.now.newProject", "New project")}
							</Button>
						}
					/>
				</div>
			);

		return (
			<>
				<ProjectPicker
					projects={projects}
					value={projectId}
					onChange={setProjectId}
					onNewProject={() => setCreating(true)}
					loading={switching}
				/>
				<Form form={form} component={false}>
					{!projectId ? null : prefill.isPending ? (
						<Skeleton active paragraph={{ rows: 3 }} title={false} />
					) : (
						<DoneSoFar
							projectId={projectId}
							carriedFrom={prefill.data?.carriedFrom}
						/>
					)}
				</Form>
			</>
		);
	};

	return (
		<EntryShell
			next={status.data?.hadCheckpoint}
			heading={t("checkpointEntry.project.title", "Tell us about your project")}
			subtitle={t(
				"checkpointEntry.project.hint",
				"Pick the project this checkpoint is for, or create one.",
			)}
			foot={
				<>
					<Link href={ENTRY_HUB_HREF}>
						<Button>{t("checkpointEntry.cancel", "Cancel")}</Button>
					</Link>
					{blocked ? (
						<Tooltip title={blocked}>{saveButton}</Tooltip>
					) : (
						saveButton
					)}
				</>
			}
		>
			{body()}
			<CreateProjectModal
				open={creating}
				variant="checkpoint"
				onCancel={() => setCreating(false)}
				onCreated={onCreated}
			/>
		</EntryShell>
	);
}
