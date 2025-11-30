"use client";

import { useTranslate } from "@tolgee/react";
import { Grid, Layout, Menu, Select } from "antd";
import { useRouter } from "next/router";
import type React from "react";
import { useCallback, useMemo } from "react";
import DangerEventForm from "@/components/event-settings/DangerEventForm";
import GeneralEventForm from "@/components/event-settings/GeneralEventForm";
import { ProtectedEventLayout } from "@/layouts/ProtectedEventLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const { Header, Sider, Content } = Layout;

const EventSettingsPage: NextPageWithLayout = () => {
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const eventId = useMemo(
		() => router.query.eventId as string,
		[router.query.eventId],
	);
	const selectedKey = useMemo(
		() => (router.query.item as string[]) || ["general"],
		[router.query.item],
	);
	const { t } = useTranslate();

	const settingsMenu: { label: React.ReactNode; key: string }[] = [
		{
			label: t("event.settings.menu.general", "General"),
			key: "general",
		},
		{
			label: t("event.settings.menu.danger", "Danger"),
			key: "danger",
		},
	];

	const renderContent = useCallback(() => {
		console.log("selectedKey", selectedKey);
		switch (selectedKey[0]) {
			case "danger":
				return <DangerEventForm eventId={eventId} />;
			default:
				return <GeneralEventForm eventId={eventId} />;
		}
	}, [selectedKey, eventId]);

	return (
		<ProtectedEventLayout title={t("Event Settings")}>
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
							router.push(`/my/events/${eventId}/settings/${value}`)
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
								router.push(`/my/events/${eventId}/settings/${key}`)
							}
						/>
					) : null}
				</Sider>
				<Content className={styles.content}>{renderContent()}</Content>
			</Layout>
		</ProtectedEventLayout>
	);
};

export default EventSettingsPage;
