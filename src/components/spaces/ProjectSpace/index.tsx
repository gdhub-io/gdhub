"use client";

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { useTranslate } from "@tolgee/react";
import { Flex, Grid, Space, Typography } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { NextSeo, type NextSeoProps } from "next-seo";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Error404 } from "@/components/Error404";
import {
	type SpaceHeaderConfig,
	useSetSpaceHeader,
} from "@/components/layouts/SpaceHeader";
import { type ContextProject, ProjectContext } from "@/contexts/ProjectContext";
import { useCurrentProject } from "@/hooks/project";
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
	description,
	seo,
	children,
	actions,
}: {
	title?: string;
	description?: string;
	seo?: NextSeoProps;
	children: ReactNode;
	actions?: ReactNode;
}) => {
	const { t } = useTranslate();
	const params = useParams<{ slug?: string }>();
	const pathname = usePathname() ?? "";
	const projectSlug = params?.slug as string;
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();
	const [contextProject, setContextProject] = useState<ContextProject>();

	const { project, isFetched } = useCurrentProject();

	const isProjectAuthor = useMemo(
		() => project?.authorId === session?.user.id,
		[project, session?.user],
	);
	const isProjectArchived = useMemo(
		() => project?.status === prismaClient.ProjectStatus.Archived,
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

	const seoSettings: NextSeoProps = {
		title: title || "Project",
		canonical: process.env.NEXT_PUBLIC_APP_URL + pathname,
		nofollow: true,
		noindex: true,
		description,
		...seo,
	};

	const spaceHeader: SpaceHeaderConfig = useMemo(() => {
		const menuItems: (ItemType & { disabled?: boolean })[] = [
			{
				key: `/user/project/${projectSlug}`,
				label: (
					<Link href={`/user/project/${projectSlug}`}>
						{t("app.user-project.menu.workflow", "Workflow")}
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
				key: `/user/project/${projectSlug}/open-positions`,
				disabled: !isProjectAuthor,
				label: (
					<Link href={`/user/project/${projectSlug}/open-positions`}>
						{t("app.user-project.menu.open-positions", "Open positions")}
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
			{
				key: `/user/project/${projectSlug}/documents`,
				label: (
					<Link href={`/user/project/${projectSlug}/documents`}>
						{t("app.user-project.menu.documents", "Documents")}
					</Link>
				),
			},
			{
				key: `/user/project/${projectSlug}/settings/general`,
				disabled: !isProjectAuthor,
				label: (
					<Link href={`/user/project/${projectSlug}/settings/general`}>
						{t("app.user.menu.settings", "Settings")}
					</Link>
				),
			},
			{
				key: `/project/${projectSlug}`,
				className: styles.publicPageMenuItem,
				label: (
					<Link
						href={`/project/${projectSlug}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						{t("Public page", "Public page")} <GoLinkExternal size={14} />
					</Link>
				),
			},
		];

		return {
			breadcrumbItems: [
				{
					title: screens.md ? (
						<Link href="/hub">{t("hub.menu.home", "Hub")}</Link>
					) : null,
				},
				{
					title: (
						<Text ellipsis={{ tooltip: true }}>
							{project?.name || "Project"}
						</Text>
					),
				},
			],
			menuItems: menuItems.filter((item) => !item.disabled),
			menuSelectedKeys: [pathname],
		};
	}, [projectSlug, isProjectAuthor, project?.name, pathname, screens.md, t]);

	useSetSpaceHeader(spaceHeader);

	if (isFetched && !project) {
		return (
			<>
				<NextSeo title="Error 404" nofollow noindex />
				<Error404
					callbackUrl={"/hub"}
					textBackButton="Back to Hub"
					theme="light"
					containerStyle={{ height: "50vh" }}
				/>
			</>
		);
	}

	return (
		<ProjectContext.Provider
			value={{ contextProject, isLoaded: isFetched, setContextProject }}
		>
			<NextSeo {...seoSettings} />
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
				<Space orientation="vertical" size={0}>
					{!!title && <Title style={{ margin: 0 }}>{title}</Title>}
					{!!description && <Text type="secondary">{description}</Text>}
				</Space>
				{actions}
			</Flex>

			{children}
		</ProjectContext.Provider>
	);
};
