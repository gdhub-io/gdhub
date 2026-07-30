"use client";

import { useTranslate } from "@tolgee/react";
import { Grid, Layout, Menu, Select } from "antd";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useMemo } from "react";
import DangerProjectForm from "@/components/project-settings/DangerProjectForm";
import GeneralProjectForm from "@/components/project-settings/GeneralProjectForm";
import LinksProjectForm from "@/components/project-settings/LinksProjectForm";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import styles from "./style.module.scss";

const { Header, Sider, Content } = Layout;

export default function ProjectSettingsPage() {
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const params = useParams<{ slug?: string; item?: string[] }>();
	const projectSlug = params?.slug as string;
	const selectedKey = useMemo(
		() => params?.item ?? ["general"],
		[params?.item],
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
		{
			label: t("project.settings.menu.danger-zone", "Danger Zone"),
			key: "danger",
		},
	];

	const renderContent = useCallback(() => {
		switch (selectedKey[0]) {
			case "links":
				return <LinksProjectForm projectSlug={projectSlug} />;
			case "danger":
				return <DangerProjectForm />;
			default:
				return <GeneralProjectForm projectSlug={projectSlug} />;
		}
	}, [selectedKey, projectSlug]);

	return (
		<ProjectSpace title={t("Project Settings")}>
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
							router.push(`/user/project/${projectSlug}/settings/${value}`)
						}
					/>
				</Header>
			) : null}
			<Layout>
				<Sider
					width={200}
					theme="light"
					className={styles.sider}
					breakpoint="lg"
					collapsedWidth="0"
					trigger={null}
				>
					{screens.lg ? (
						<Menu
							mode="vertical"
							theme="light"
							selectedKeys={selectedKey}
							style={{ height: "100%", borderRight: 0 }}
							items={settingsMenu}
							onSelect={({ key }) =>
								router.push(`/user/project/${projectSlug}/settings/${key}`)
							}
						/>
					) : null}
				</Sider>
				<Content className={styles.content}>{renderContent()}</Content>
			</Layout>
		</ProjectSpace>
	);
}
