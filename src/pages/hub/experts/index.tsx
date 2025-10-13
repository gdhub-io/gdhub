import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Form, Row, Select, Spin, Typography } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useWorkDirections } from "@/hooks/library";
import styles from "./styles.module.scss";

const ProtectedLayout = dynamic(
	() => import("@/layouts/ProtectedLayout").then((m) => m.ProtectedLayout),
	{ ssr: false },
);
const ExpertRequestModal = dynamic(
	() => import("@/components/modals/ExpertRequestModal"),
	{ ssr: false },
);
const ExpertList = dynamic(
	() => import("@/components/ExpertList").then((m) => m.default),
	{ ssr: false },
);

const { Text, Title } = Typography;

const ExpertsPage = () => {
	const { t } = useTranslate();
	const [selectedWorkDirection, setSelectedWorkDirection] = useState<
		string | undefined
	>(undefined);
	const [expertRequestModalOpen, setExpertRequestModalOpen] = useState<
		string | undefined
	>(undefined);
	const { options: workDirectionOptions } = useWorkDirections();

	const handleFilterChange = (value: string) => {
		setSelectedWorkDirection(value || undefined);
	};

	const getTelegramExpertLink = (specialityId: string) => {
		return `https://t.me/gdhub_experts_bot/app?startapp=expert_${specialityId}`;
	};

	const handleExpertClick = async (expertId: string) => {
		setExpertRequestModalOpen(expertId);
	};

	return (
		<ProtectedLayout
			title={t("experts.page.title", "Experts")}
			subTitle={t(
				"experts.page.description",
				"On this page, you can find experts who are ready to help with your questions. Click on a expert card to contact them via Telegram",
			)}
			seo={{
				title: t("experts.page.title", "Experts"),
				description: t(
					"experts.page.description",
					"On this page, you can find experts who are ready to help with your questions.",
				),
			}}
			extra={
				<Link href="/hub/experts/my-requests">
					<Button>{t("page.experts.myExperts", "My requests")}</Button>
				</Link>
			}
		>
			<div className={styles.filterContainer}>
				<Form variant="filled">
					<Select
						allowClear
						placeholder={t("experts.page.filter", "Filter by direction")}
						options={workDirectionOptions}
						onChange={handleFilterChange}
						className={styles.filterSelect}
					/>
				</Form>
			</div>

			<Row gutter={[24, 24]} className={styles.mentorsGrid}>
				<ExpertList
					filter={{ workDirectionId: selectedWorkDirection }}
					onClick={handleExpertClick}
				/>
			</Row>

			<ExpertRequestModal
				open={!!expertRequestModalOpen}
				onCancel={() => setExpertRequestModalOpen(undefined)}
				onUpdate={() => setExpertRequestModalOpen(undefined)}
				expertId={expertRequestModalOpen || ""}
			/>
		</ProtectedLayout>
	);
};

export default ExpertsPage;
