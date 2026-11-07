"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Grid, Layout, Menu, Select } from "antd";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { ScoutAlertsForm } from "@/components/scout/ScoutAlertsForm";
import { ScoutDangerZone } from "@/components/scout/ScoutDangerZone";
import { ScoutFocusForm } from "@/components/scout/ScoutFocusForm";
import { ScoutGeneralForm } from "@/components/scout/ScoutGeneralForm";
import {
	FormSkeleton,
	type FormSkeletonProps,
} from "@/components/ui/FormSkeleton";
import { LoadError } from "@/components/ui/LoadError";
import type { ScoutCabinet } from "@/repositories/scout/scout";
import styles from "./style.module.scss";

type Section = "general" | "focus" | "alerts" | "danger";

const SECTION_SKELETONS: Record<
	Exclude<Section, "danger">,
	FormSkeletonProps
> = {
	general: { fields: 5, textarea: true },
	focus: { fields: 3 },
	alerts: { fields: 2 },
};

export function ScoutSettingsClient() {
	const { t } = useTranslate();
	const router = useRouter();
	const screens = Grid.useBreakpoint();
	const params = useParams<{ section?: string[] }>();
	const section = (params?.section?.[0] ?? "general") as Section;
	const open = (key: string) => router.push(`/scout/settings/${key}`);

	const {
		data: cabinet,
		isPending,
		isError,
		refetch,
	} = useQuery<ScoutCabinet>({
		queryKey: ["scout", "cabinet"],
		queryFn: () => axios.get("/api/scout/cabinet").then((res) => res.data),
	});

	const items = [
		{ key: "general", label: t("scout.settings.menu.general", "General") },
		{ key: "focus", label: t("scout.settings.menu.focus", "Investment Focus") },
		{ key: "alerts", label: t("scout.settings.menu.alerts", "Alerts") },
		{ key: "danger", label: t("scout.settings.menu.danger", "Danger zone") },
	];

	const renderSection = () => {
		if (section === "danger") return <ScoutDangerZone />;
		if (isError && !cabinet) {
			return (
				<LoadError
					title={t(
						"scout.settings.load-error",
						"Scout settings could not be loaded",
					)}
					onRetry={() => refetch()}
				/>
			);
		}
		if (isPending) {
			return (
				<FormSkeleton
					{...(SECTION_SKELETONS[section] ?? SECTION_SKELETONS.general)}
				/>
			);
		}
		if (!cabinet) return null;

		switch (section) {
			case "focus":
				return <ScoutFocusForm cabinet={cabinet} />;
			case "alerts":
				return <ScoutAlertsForm cabinet={cabinet} />;
			default:
				return <ScoutGeneralForm cabinet={cabinet} />;
		}
	};

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("scout.settings.title", "Settings")}
				subTitle={t(
					"scout.settings.subtitle",
					"Manage your scout cabinet and matching",
				)}
			/>

			<Layout>
				{screens.lg ? (
					<Layout.Sider
						width={300}
						theme="light"
						className={styles.sider}
						breakpoint="lg"
						collapsedWidth="0"
						trigger={null}
					>
						<Menu
							mode="vertical"
							selectedKeys={[section]}
							items={items}
							className={styles.menu}
							onSelect={({ key }) => open(key)}
						/>
					</Layout.Sider>
				) : (
					// The sider collapses to nothing below `lg`, so without this the
					// sections are unreachable on a phone — the same fallback the
					// other settings screens carry.
					<Select
						className={styles.sectionPicker}
						options={items}
						value={section}
						onChange={open}
					/>
				)}

				<Layout.Content className={styles.content}>
					{renderSection()}
				</Layout.Content>
			</Layout>
		</div>
	);
}
