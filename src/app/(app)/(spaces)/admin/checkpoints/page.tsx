"use client";

import { IconPlus } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tabs } from "antd";
import { Suspense, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { CheckpointsTable } from "@/components/admin/CheckpointsTable";
import {
	type CuratorsSegment,
	CuratorsTable,
} from "@/components/admin/CuratorsTable";
import { NewPromoCodeModal } from "@/components/admin/NewPromoCodeModal";
import { PromoCodesTable } from "@/components/admin/PromoCodesTable";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { usePromoCodes } from "@/hooks/admin-promo-codes";
import { useAdminCurators } from "@/hooks/curators";
import { useUrlTab } from "@/hooks/useUrlTab";
import styles from "./style.module.scss";

type Tab = "checkpoints" | "curators" | "promo-codes";

const TABS: Tab[] = ["checkpoints", "curators", "promo-codes"];

export default function AdminCheckpointsPage() {
	// useSearchParams needs a Suspense boundary to prerender.
	return (
		<Suspense>
			<AdminCheckpoints />
		</Suspense>
	);
}

function AdminCheckpoints() {
	const { t } = useTranslate();
	const { can } = useAccess();
	const canManage = can("admin.checkpoints.manage");
	const canViewCurators = can("admin.curators.view");
	const [creating, setCreating] = useState(false);

	const [tab, open] = useUrlTab(
		"tab",
		canViewCurators ? TABS : TABS.filter((key) => key !== "curators"),
		"checkpoints",
	);

	// Fetched once the tab is opened: Checkpoints is the one that shows first.
	const promoCodes = usePromoCodes(tab === "promo-codes");

	return (
		<AdminSpace>
			<div className="layout-background">
				<ProtectedPageHeader
					title={t("admin.checkpoints.title", "Checkpoints")}
					extra={
						canManage &&
						tab === "promo-codes" && (
							<Button
								type="primary"
								icon={<IconPlus size={16} />}
								onClick={() => setCreating(true)}
							>
								{t("admin.checkpoints.promoCodes.new", "New code")}
							</Button>
						)
					}
				/>

				<Tabs
					className={styles.tabs}
					activeKey={tab}
					onChange={open}
					items={[
						{
							key: "checkpoints",
							label: t("admin.checkpoints.tab.checkpoints", "Checkpoints"),
							children: <CheckpointsTable canManage={canManage} />,
						},
						...(canViewCurators
							? [
									{
										key: "curators",
										label: t("admin.checkpoints.tab.curators", "Curators"),
										children: <CuratorsTab />,
									},
								]
							: []),
						{
							key: "promo-codes",
							label: t("admin.checkpoints.tab.promoCodes", "Promo codes"),
							children: (
								<PromoCodesTable
									codes={promoCodes.data}
									// A failed refetch keeps the rows it already has.
									status={promoCodes.data ? "success" : promoCodes.status}
									onRetry={() => promoCodes.refetch()}
									canManage={canManage}
								/>
							),
						},
					]}
				/>

				<NewPromoCodeModal open={creating} onClose={() => setCreating(false)} />
			</div>
		</AdminSpace>
	);
}

/** Mounted only once its tab is opened, so the list is fetched then. */
function CuratorsTab() {
	const { can } = useAccess();
	const [filter, setFilter] = useState<CuratorsSegment>("pending");
	const [query, setQuery] = useState("");
	const curators = useAdminCurators({
		pending: filter === "pending",
		q: query,
	});
	// Unsearched waiting list for the filter's count; the same cache entry as the default view.
	const waiting = useAdminCurators({ pending: true, q: "" });

	return (
		<CuratorsTable
			rows={curators.data}
			// A failed refetch keeps the rows it already has.
			status={curators.data ? "success" : curators.status}
			onRetry={() => curators.refetch()}
			filter={filter}
			onFilterChange={setFilter}
			onSearch={setQuery}
			pendingCount={waiting.data?.length}
			canManage={can("admin.curators.manage")}
		/>
	);
}
