"use client";

import { useTranslate } from "@tolgee/react";
import dynamic from "next/dynamic";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import styles from "./style.module.scss";

const VacanciesList = dynamic(() => import("@/components/VacanciesList"), {
	ssr: false,
});

export default function HubJobsClient() {
	const { t } = useTranslate();

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("page.vacancies.title", "Jobs")}
				subTitle={t(
					"page.vacancies.subTitle",
					"Invest your time in the success of new game projects",
				)}
			/>
			<div className={styles.container}>
				<div className="project-vacancies" style={{ marginTop: 32 }}>
					<VacanciesList location="hub" />
				</div>
			</div>
		</div>
	);
}
