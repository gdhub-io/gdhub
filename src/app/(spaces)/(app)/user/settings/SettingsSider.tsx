"use client";

import { useTranslate } from "@tolgee/react";
import { Grid, Layout, Menu, type MenuProps, Select } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import styles from "./style.module.scss";

const { Header, Sider } = Layout;

/**
 * Persisted sider для /user/settings/*. Не размонтируется при переходе
 * между табами — это и есть основной выигрыш переезда на нативные
 * layout.tsx.
 */
export function SettingsSider() {
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const params = useParams<{ item?: string }>();
	const currentItem = (params?.item as string) || "general";
	const { t } = useTranslate();

	const items: MenuProps["items"] = useMemo(
		() => [
			{ label: t("profile.settings.menu.general", "General"), key: "general" },
			{
				label: t("profile.settings.menu.specialities", "Specialities"),
				key: "specialities",
			},
			{
				label: t("profile.settings.menu.mentorship", "Mentorship"),
				key: "mentorship",
			},
			{
				label: t("profile.settings.menu.resources", "Resources"),
				key: "resources",
			},
			{
				label: t("profile.settings.menu.connections", "Connections"),
				key: "connections",
			},
			{
				label: t("profile.settings.menu.interests", "Interests"),
				key: "interests",
			},
			{
				label: t("profile.settings.menu.payments", "Payments"),
				key: "payments",
			},
			{
				label: t("profile.settings.menu.danger", "Danger Zone"),
				key: "danger",
			},
		],
		[t],
	);

	if (!screens.lg) {
		return (
			<Header style={{ padding: 0, height: 100 }}>
				<Select
					options={items.map((d) => ({
						label: (d as { label: string }).label,
						value: d?.key as string,
					}))}
					value={currentItem}
					style={{ width: "100%", margin: "8px 0" }}
					onChange={(value) => router.push(`/user/settings/${value}`)}
				/>
			</Header>
		);
	}

	return (
		<Sider
			width={200}
			theme="light"
			className={styles.sider}
			breakpoint="lg"
			collapsedWidth="0"
			trigger={null}
		>
			<Menu
				mode="vertical"
				theme="light"
				selectedKeys={[currentItem]}
				style={{ height: "100%", borderRight: 0 }}
				items={items}
				onSelect={({ key }) => router.push(`/user/settings/${key}`)}
			/>
		</Sider>
	);
}
