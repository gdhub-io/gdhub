"use client";

import { useTranslate } from "@tolgee/react";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import VacanciesList from "@/components/VacanciesList";
import styles from "./style.module.scss";

export function JobsClient() {
	const { t } = useTranslate();

	return (
		<>
			<PublicPageHeader
				title={t("Open positions")}
				subTitle="for anyone willing to invest their time in bringing new indie games to life"
				backgroundImage="https://cdn.sanity.io/images/3ao2jrg0/prod/e3fd43a88ee86de839cdd75927ca3ee9d4d12789-1920x300.png"
			/>
			<div className="layout-background">
				<div className={styles.container}>
					<div className="project-vacancies">
						<VacanciesList />
					</div>
				</div>
			</div>
		</>
	);
}
