"use client";

import { useTranslate } from "@tolgee/react";
import { Grid, Layout, Menu, Select } from "antd";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useMemo } from "react";
import CertificationEventForm from "@/components/event-settings/CertificationEventForm";
import DangerEventForm from "@/components/event-settings/DangerEventForm";
import GeneralEventForm from "@/components/event-settings/GeneralEventForm";
import { EventSpace } from "@/components/spaces/EventSpace";
import styles from "./style.module.scss";

const { Header, Sider, Content } = Layout;

export default function EventSettingsPage() {
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const params = useParams<{ eventId?: string; item?: string[] }>();
	const eventId = params?.eventId as string;
	const selectedKey = useMemo(
		() => params?.item ?? ["general"],
		[params?.item],
	);
	const { t } = useTranslate();

	const settingsMenu: {
		label: React.ReactNode;
		key: string;
		danger?: boolean;
	}[] = [
		{
			label: t("event.settings.menu.general", "General"),
			key: "general",
		},
		{
			label: t("event.settings.menu.certification", "Certification"),
			key: "certification",
		},
		{
			// The one section that can end the event carries the colour for it.
			label: t("event.settings.menu.danger", "Danger"),
			key: "danger",
			danger: true,
		},
	];

	const renderContent = useCallback(() => {
		switch (selectedKey[0]) {
			case "certification":
				return <CertificationEventForm eventId={eventId} />;
			case "danger":
				return <DangerEventForm eventId={eventId} />;
			default:
				return <GeneralEventForm eventId={eventId} />;
		}
	}, [selectedKey, eventId]);

	return (
		<EventSpace title={t("Event Settings")}>
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
							router.push(`/user/event/${eventId}/settings/${value}`)
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
								router.push(`/user/event/${eventId}/settings/${key}`)
							}
						/>
					) : null}
				</Sider>
				<Content className={styles.content}>{renderContent()}</Content>
			</Layout>
		</EventSpace>
	);
}
