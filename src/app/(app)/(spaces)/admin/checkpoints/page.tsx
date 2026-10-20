"use client";

import { IconPlus } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tabs } from "antd";
import { useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { CheckpointsTable } from "@/components/admin/CheckpointsTable";
import { NewPromoCodeModal } from "@/components/admin/NewPromoCodeModal";
import { PromoCodesTable } from "@/components/admin/PromoCodesTable";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { usePromoCodes } from "@/hooks/admin-promo-codes";
import styles from "./style.module.scss";

export default function AdminCheckpointsPage() {
	const { t } = useTranslate();
	const { can } = useAccess();
	const canManage = can("admin.checkpoints.manage");
	const [creating, setCreating] = useState(false);
	const [tab, setTab] = useState("checkpoints");
	const promoCodes = usePromoCodes();

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
					onChange={setTab}
					items={[
						{
							key: "checkpoints",
							label: t("admin.checkpoints.tab.checkpoints", "Checkpoints"),
							children: <CheckpointsTable canManage={canManage} />,
						},
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
