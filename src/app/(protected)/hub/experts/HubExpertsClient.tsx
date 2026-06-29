"use client";

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTranslate } from "@tolgee/react";
import { Button, ConfigProvider, Form, Row, Select, Space } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { DirectionSelect } from "@/components/DirectionSelect";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
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
		lang?: prismaClient.Language;
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
					<Link href="/hub/experts/my-requests">
						<Button>{t("page.experts.myExperts", "My requests")}</Button>
					</Link>
				}
			/>
			<div className={styles.filterContainer}>
				<ConfigProvider
					theme={{
						components: {
							Select: { controlHeight: 36 },
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
						<Space size={16}>
							<Form.Item name="lang">
								<Select
									allowClear
									placeholder={t(
										"experts.page.filter.language",
										"Answering language",
									)}
									options={[
										{
											value: prismaClient.$Enums.Language.en,
											label: t(
												"experts.page.filter.language.en",
												"English speaking experts",
											),
										},
										{
											value: prismaClient.$Enums.Language.ru,
											label: t(
												"experts.page.filter.language.ru",
												"Russian speaking experts",
											),
										},
									]}
									className={styles.filterSelect}
								/>
							</Form.Item>

							<Form.Item name="workDirectionId">
								<DirectionSelect
									allowClear
									placeholder={t("experts.page.filter", "Filter by direction")}
									options={workDirectionOptions ?? []}
									className={styles.filterSelect}
								/>
							</Form.Item>
						</Space>
					</Form>
				</ConfigProvider>
			</div>

			<Row gutter={[24, 24]} className={styles.mentorsGrid}>
				<ExpertList filter={filter} onClick={handleExpertClick} />
			</Row>

			<ExpertRequestModal
				open={!!expertRequestModalOpen}
				onCancel={() => setExpertRequestModalOpen(undefined)}
				onUpdate={() => setExpertRequestModalOpen(undefined)}
				expertId={expertRequestModalOpen || ""}
			/>
		</div>
	);
}
