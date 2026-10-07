"use client";

import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Grid, Space, Typography } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { Error404 } from "@/components/Error404";
import {
	type SpaceHeaderConfig,
	useSetSpaceHeader,
} from "@/components/layouts/SpaceHeader";
import { ProjectStatus } from "@/config/prisma-enums";
import { type ContextProject, ProjectContext } from "@/contexts/ProjectContext";
import { useCurrentProject } from "@/hooks/project";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

/**
 * Project space chrome: publishes the project breadcrumbs and tabs into the
 * global app header, exposes ProjectContext to the pages below, and renders the
 * per-page hero (title / description / actions) plus the archived banner.
 *
 * It deliberately owns no shell of its own — header, chat and theme come from
 * the surrounding ProtectedShell in `app/(app)/layout.tsx`.
 */
export const ProjectSpace = ({
	title,
	titleExtra,
	description,
	children,
	actions,
	backHref,
}: {
	title?: string;
	/** Sits on the title's line, after it — a stage tag, a status. */
	titleExtra?: ReactNode;
	description?: string;
	children: ReactNode;
	actions?: ReactNode;
	/** A page one level below a tab — the hero gains the way back to it. */
	backHref?: string;
}) => {
	const { t } = useTranslate();
	const params = useParams<{ slug?: string }>();
	const pathname = usePathname() ?? "";
	const projectSlug = params?.slug as string;
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();
	const { can } = useAccess();
	const [contextProject, setContextProject] = useState<ContextProject>();

	const { project, isFetched } = useCurrentProject();

	const isProjectAuthor = useMemo(
		() => project?.authorId === session?.user.id,
		[project, session?.user],
	);
	const isProjectArchived = useMemo(
		() => project?.status === ProjectStatus.Archived,
		[project?.status],
	);
	const archivedAtText = useMemo(() => {
		if (!project?.archivedAt) return null;

		return dayjs(project.archivedAt).format("LL");
	}, [project?.archivedAt]);

	useEffect(() => {
		if (!project) return;

		setContextProject({
			id: project.id,
			name: project.name,
			team: project.team,
			isProjectAuthor,
			isProjectArchived,
			archivedAt: project.archivedAt,
		});
	}, [project, isProjectAuthor, isProjectArchived]);

	useDocumentTitle(
		title ? `${title} · ${project?.name ?? "Project"}` : project?.name,
	);

	const spaceHeader: SpaceHeaderConfig = useMemo(() => {
		const menuItems: (ItemType & { disabled?: boolean })[] = [
			// Checkpoints live on the workflow path now; their old tab is gone.
			{
				key: `/user/project/${projectSlug}/workflow`,
				label: (
					<Link href={`/user/project/${projectSlug}/workflow`}>
						{t("app.user-project.menu.workflow", "Workflow")}
					</Link>
				),
			},
			{
				key: `/user/project/${projectSlug}/artifacts`,
				label: (
					<Link href={`/user/project/${projectSlug}/artifacts`}>
						{t("app.user-project.menu.artifacts", "Artifacts")}
					</Link>
				),
			},
			{
				key: `/user/project/${projectSlug}/devlog`,
				label: (
					<Link href={`/user/project/${projectSlug}/devlog`}>
						{t("app.user-project.menu.overview", "Devlog")}
					</Link>
				),
			},
			{
				key: `/user/project/${projectSlug}/team`,
				label: (
					<Link href={`/user/project/${projectSlug}/team`}>
						{t("app.user-project.menu.team", "Team")}
					</Link>
				),
			},
			// Shown to whoever may open it, rather than shown greyed out: a tab you
			// can see but never use is a promise the space does not keep.
			...(can("project.vacancies.manage")
				? [
						{
							key: `/user/project/${projectSlug}/open-positions`,
							label: (
								<Link href={`/user/project/${projectSlug}/open-positions`}>
									{t("app.user-project.menu.open-positions", "Open positions")}
								</Link>
							),
						},
					]
				: []),
			...(can("project.info.edit")
				? [
						{
							key: `/user/project/${projectSlug}/settings/general`,
							label: (
								<Link href={`/user/project/${projectSlug}/settings/general`}>
									{t("app.user.menu.settings", "Settings")}
								</Link>
							),
						},
					]
				: []),
			{
				key: `/project/${projectSlug}`,
				className: styles.publicPageMenuItem,
				label: (
					<Link
						href={`/project/${projectSlug}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						{t("Public page", "Public page")} <IconExternalLink size={14} />
					</Link>
				),
			},
		];

		return {
			// The parent crumb points at the hub: there is no "My projects" page,
			// and the hub home is where a person's projects actually are. Point it
			// elsewhere the day such a page exists.
			trail: {
				parent: {
					href: "/hub",
					label: t("hub.menu.my-projects", "My projects"),
				},
				current: { label: project?.name || t("project.untitled", "Project") },
				space: project?.id ? { kind: "project", id: project.id } : undefined,
			},
			menuItems: menuItems.filter((item) => !item.disabled),
			// A tab stays lit for everything beneath it — buying a checkpoint and a
			// session page are still the Workflow tab, and a nav that goes dark as
			// soon as you use it tells the reader they have left the space.
			menuSelectedKeys: [
				menuItems
					.map((item) => String(item?.key ?? ""))
					.filter((key) => pathname === key || pathname.startsWith(`${key}/`))
					.sort((a, b) => b.length - a.length)[0] ?? pathname,
			],
		};
	}, [projectSlug, can, project?.name, pathname, screens.md, t]);

	useSetSpaceHeader(spaceHeader);

	if (isFetched && !project) {
		return (
			<Error404
				callbackUrl={"/hub"}
				textBackButton="Back to Hub"
				theme="light"
				containerStyle={{ height: "50vh" }}
			/>
		);
	}

	return (
		<ProjectContext.Provider
			value={{ contextProject, isLoaded: isFetched, setContextProject }}
		>
			{isProjectArchived && (
				<div className={styles.archivedBanner}>
					{t("project.archived.banner", "Project archived since {date}", {
						date:
							archivedAtText ||
							t("project.archived.banner.unknownDate", "unknown date"),
					})}
				</div>
			)}
			<Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
				<Flex gap={12} align="center">
					{!!backHref && (
						<Link href={backHref}>
							{/* The same way back the protected pages draw: a text button on
							    the left of the title, at the control size antd already is. */}
							<Button
								type="text"
								aria-label={t("common.back", "Back")}
								icon={<IconArrowLeft />}
							/>
						</Link>
					)}
					<Space orientation="vertical" size={0}>
						<Flex gap={10} align="center" wrap>
							{!!title && <Title style={{ margin: 0 }}>{title}</Title>}
							{titleExtra}
						</Flex>
						{!!description && <Text type="secondary">{description}</Text>}
					</Space>
				</Flex>
				{actions}
			</Flex>

			{children}
		</ProjectContext.Provider>
	);
};
