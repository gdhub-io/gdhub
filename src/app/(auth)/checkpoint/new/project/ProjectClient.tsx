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
import { EntryShell } from "@/components/checkpoints/entry/EntryShell";
import {
	checkoutHref,
	entryHubHref,
} from "@/components/checkpoints/entry/hrefs";
import { ProjectPicker } from "@/components/checkpoints/entry/ProjectPicker";
import CreateProjectModal, {
	type CreatedProject,
} from "@/components/modals/CreateProjectModal";
import { EmptyState } from "@/components/ui";
import { trackCheckpoint } from "@/helpers/gtm";
import {
	entryKeys,
	useEntryPrefill,
	useEntryStatus,
	useRateLimitWarning,
	useSaveEntryProject,
} from "@/hooks/checkpoint-entry";
import type { CheckpointBlocker, EntryStatusDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

type ProjectValues = { [DONE_SO_FAR_FIELD]: DoneSoFarRow[] };

export type ProjectClientProps = {
	/** `?project=`: the project the way in was opened for, picked when it is free. */
	projectSlug?: string;
};

/** Item 2 (12.2 – 12.2c): the project, and what is already done on it. */
export function ProjectClient({ projectSlug }: ProjectClientProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [form] = Form.useForm<ProjectValues>();

	const status = useEntryStatus();
	const save = useSaveEntryProject();
	const rateLimited = useRateLimitWarning();
	const hubHref = entryHubHref(projectSlug);

	const [projectId, setProjectId] = useState<string>();
	const [creating, setCreating] = useState(false);
	const [createdId, setCreatedId] = useState<string>();

	const projects = status.data?.projects ?? [];
	const available = projects.filter((project) => !project.running);

	// The asked-for project, then the draft's, then the most recent one — never one already under way.
	useEffect(() => {
		if (projectId || !status.data) return;
		const open = status.data.projects.filter((project) => !project.running);
		const draftId = status.data.draft?.projectId;
		setProjectId(
			open.find((project) => project.slug === projectSlug)?.id ??
				open.find((project) => project.id === draftId)?.id ??
				open[0]?.id,
		);
	}, [projectId, projectSlug, status.data]);

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
		setCreatedId(project.id);
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
			const carried = prefill.data?.carriedFrom
				? new Set(prefill.data.items.map((item) => item.text.trim()))
				: new Set<string>();
			trackCheckpoint("checkpoint_project_done", {
				project: projectId === createdId ? "new" : "existing",
				lines: filled.length,
				with_evidence: filled.filter((row) => row.artifact).length,
				carried_over: filled.filter((row) => carried.has(row.text.trim()))
					.length,
			});
			// A draft saved before means it was opened from the hub to edit; otherwise on to the goal.
			const slug = projects.find((project) => project.id === projectId)?.slug;
			router.push(
				status.data?.draft || !slug ? hubHref : checkoutHref(slug, "goal"),
			);
		} catch (error) {
			if (rateLimited(error)) return;
			const blocker: CheckpointBlocker["reason"] | undefined =
				isAxiosError(error) && error.response?.status === 409
					? (error.response.data?.blocker?.reason ?? "checkpointOpen")
					: undefined;
			message.error(
				blocker
					? blockerText(blocker)
					: t("checkpointEntry.project.failed", "Could not save — try again"),
			);
		}
	};

	const blockerText = (reason: CheckpointBlocker["reason"]) => {
		if (reason === "purchaseClosed")
			return t(
				"checkpointEntry.closed",
				"Checkpoints open soon — we'll email you when you can head for one.",
			);
		if (reason === "noStage")
			return t(
				"checkpointEntry.project.noStage",
				"This project has no workflow stage yet — try again or pick another project.",
			);
		return t(
			"checkpointEntry.project.running",
			"This project already has a checkpoint under way.",
		);
	};

	const saveButton = (
		<Button
			type="primary"
			loading={save.isPending}
			disabled={!!blocked}
			icon={blocked ? <IconLock size={16} /> : undefined}
			onClick={submit}
		>
			{status.data?.draft
				? t("checkpointEntry.saveBack", "Save and go back")
				: t("checkpointEntry.saveContinue", "Save and continue")}
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
					<Link href={hubHref}>
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
