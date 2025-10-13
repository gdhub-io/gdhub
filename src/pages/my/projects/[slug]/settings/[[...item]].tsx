"use client";

import { useTranslate } from "@tolgee/react";
import { Grid, Layout, Menu, Select } from "antd";
import { useRouter } from "next/router";
import type React from "react";
import { useCallback, useMemo } from "react";
import GeneralProjectForm from "@/components/project-settings/GeneralProjectForm";
import LinksProjectForm from "@/components/project-settings/LinksProjectForm";
import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const { Header, Sider, Content } = Layout;

const ProjectSettingsPage: NextPageWithLayout = () => {
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const projectSlug = useMemo(
		() => router.query.slug as string,
		[router.query.slug],
	);
	const selectedKey = useMemo(
		() => (router.query.item as string[]) || ["general"],
		[router.query.item],
	);
	const { t } = useTranslate();

	const settingsMenu: { label: React.ReactNode; key: string }[] = [
		{
			label: t("project.settings.menu.general", "General"),
			key: "general",
		},
		{
			label: t("project.settings.menu.links", "Links"),
			key: "links",
		},
	];

	const renderContent = useCallback(() => {
		console.log("selectedKey", selectedKey);
		switch (selectedKey[0]) {
			case "links":
				return <LinksProjectForm projectSlug={projectSlug} />;
			case "general":
			default:
				return <GeneralProjectForm projectSlug={projectSlug} />;
		}
	}, [selectedKey, projectSlug]);

	return (
		<ProtectedProjectLayout title={t("Project Settings")}>
			{!screens.lg ? (
				<Header style={{ padding: 0, height: 100 }}>
					<Select
						options={settingsMenu.map((d) => ({
							label: d.label,
							value: d.key,
						}))}
						value={selectedKey}
						style={{ width: "100%", margin: "8px 0" }}
						onChange={(value) =>
							router.push(`/my/projects/${projectSlug}/settings/${value}`)
						}
					/>
				</Header>
			) : null}
			<Layout>
				<Sider
					width={200}
					className={styles.sider}
					breakpoint="lg"
					collapsedWidth="0"
					trigger={null}
				>
					{screens.lg ? (
						<Menu
							mode="vertical"
							selectedKeys={selectedKey}
							style={{ height: "100%", borderRight: 0 }}
							items={settingsMenu}
							onSelect={({ key }) =>
								router.push(`/my/projects/${projectSlug}/settings/${key}`)
							}
						/>
					) : null}
				</Sider>
				<Content className={styles.content}>{renderContent()}</Content>
			</Layout>
		</ProtectedProjectLayout>
	);
};

export default ProjectSettingsPage;
