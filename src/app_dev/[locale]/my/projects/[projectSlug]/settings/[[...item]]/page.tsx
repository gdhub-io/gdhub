"use client";

import { useTranslate } from "@tolgee/react";
import { Grid, Layout, Menu, Select } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import GeneralProjectForm from "@/components/project-settings/GeneralProjectForm";
import LinksProjectForm from "@/components/project-settings/LinksProjectForm";
import styles from "./style.module.scss";

const { Header, Sider, Content } = Layout;

export default function ProjectSettingsPage() {
  const screens = Grid.useBreakpoint();
  const router = useRouter();
  const params = useParams() as { projectSlug: string; item?: string[] };
  const projectSlug = params.projectSlug;
  const selectedKey = useMemo(() => params.item || ["general"], [params.item]);
  const { t } = useTranslate();

  const settingsMenu = [
    { label: t("project.settings.menu.general", "General"), key: "general" },
    { label: t("project.settings.menu.links", "Links"), key: "links" },
  ];

  const renderContent = () => {
    switch (selectedKey[0]) {
      case "links":
        return <LinksProjectForm projectSlug={projectSlug} />;
      case "general":
      default:
        return <GeneralProjectForm projectSlug={projectSlug} />;
    }
  };

  return (
    <>
      {!screens.lg ? (
        <Header style={{ padding: 0, height: 100 }}>
          <Select
            options={settingsMenu.map((d) => ({ label: d.label, value: d.key }))}
            value={selectedKey}
            style={{ width: "100%", margin: "8px 0" }}
            onChange={(value) => router.push(`./${value}`)}
          />
        </Header>
      ) : null}
      <Layout>
        <Sider width={200} className={styles.sider} breakpoint="lg" collapsedWidth="0" trigger={null}>
          {screens.lg ? (
            <Menu
              mode="vertical"
              selectedKeys={selectedKey}
              style={{ height: "100%", borderRight: 0 }}
              items={settingsMenu}
              onSelect={({ key }) => router.push(`./${String(key)}`)}
            />
          ) : null}
        </Sider>
        <Content className={styles.content}>{renderContent()}</Content>
      </Layout>
    </>
  );
}



