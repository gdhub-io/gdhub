"use client";

import { useTranslate } from "@tolgee/react";
import { Button, ConfigProvider, Form, Select } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { DirectionSelect } from "@/components/DirectionSelect";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { Language } from "@/config/prisma-enums";
import { useWorkDirections } from "@/hooks/library";
import styles from "./styles.module.scss";

const ExpertRequestModal = dynamic(
	() => import("@/components/modals/ExpertRequestModal"),
	{ ssr: false },
);
const ExpertList = dynamic(
	() => import("@/components/ExpertList").then((m) => m.default),
	{ ssr: false },
);

export default function HubExpertsClient() {
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const [filter, setFilter] = useState<{
		workDirectionId?: string;
		lang?: Language;
	}>({});

	const [expertRequestModalOpen, setExpertRequestModalOpen] = useState<
		string | undefined
	>(undefined);
	const { options: workDirectionOptions } = useWorkDirections();

	const handleExpertClick = async (expertId: string) => {
		setExpertRequestModalOpen(expertId);
	};

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("experts.page.title", "Experts")}
				subTitle={t(
					"experts.page.description",
					"On this page, you can find experts who are ready to help with your questions. Click on a expert card to contact them via Telegram",
				)}
				extra={
					<Link href="/advisor/requests">
						<Button>{t("page.experts.myExperts", "My requests")}</Button>
					</Link>
				}
			/>
			<div className={styles.filterContainer}>
				<ConfigProvider
					theme={{
						components: {
							// Height comes from the theme's control ladder — a local 36
							// here is how this page ended up with shorter controls than
							// every other filter bar.
							Form: { itemMarginBottom: 0 },
						},
					}}
				>
					<Form
						variant="filled"
						form={form}
						onValuesChange={(_changedValues, allValues) => {
							setFilter({
								workDirectionId: allValues.workDirectionId,
								lang: allValues.lang,
							});
						}}
					>
						{/* A fixed row of 250px-wide selects ran off the side of a
						    phone. Wrapping row, each select free to grow. */}
						<div className={styles.filterRow}>
							<Form.Item name="lang" className={styles.filterItem}>
								<Select
									allowClear
									placeholder={t(
										"experts.page.filter.language",
										"Answering language",
									)}
									options={[
										{
											value: Language.en,
											label: t(
												"experts.page.filter.language.en",
												"English speaking experts",
											),
										},
										{
											value: Language.ru,
											label: t(
												"experts.page.filter.language.ru",
												"Russian speaking experts",
											),
										},
									]}
									className={styles.filterSelect}
								/>
							</Form.Item>

							<Form.Item name="workDirectionId" className={styles.filterItem}>
								<DirectionSelect
									allowClear
									placeholder={t("experts.page.filter", "Filter by direction")}
									options={workDirectionOptions ?? []}
									className={styles.filterSelect}
								/>
							</Form.Item>
						</div>
					</Form>
				</ConfigProvider>
			</div>

			{/* No Row here: ExpertList renders its own grid, and two nested antd
			    Rows stack their negative gutter margins — the cards ended up 20px
			    outside the page gutter on each side, which is exactly the gutter. */}
			<div className={styles.mentorsGrid}>
				<ExpertList filter={filter} onClick={handleExpertClick} />
			</div>

			<ExpertRequestModal
				open={!!expertRequestModalOpen}
				onCancel={() => setExpertRequestModalOpen(undefined)}
				onUpdate={() => setExpertRequestModalOpen(undefined)}
				expertId={expertRequestModalOpen || ""}
			/>
		</div>
	);
}
