"use client";

import { useTranslate } from "@tolgee/react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import VacanciesList from "@/components/VacanciesList";
import styles from "./style.module.scss";

const ProtectedLayout = dynamic(
	() => import("@/layouts/ProtectedLayoutApp").then((m) => m.ProtectedLayout),
	{ ssr: false },
);

export default function VacanciesPage() {
	const pathname = usePathname();
	const { t } = useTranslate();

	return (
		<ProtectedLayout
			title={t("page.vacancies.title", "Vacancies")}
			subTitle={t(
				"page.vacancies.subTitle",
				"Invest your time in the success of new game projects",
			)}
			seo={{ openGraph: { type: "website", url: pathname || undefined } }}
		>
			<div className={styles.container}>
				<div className="project-vacancies" style={{ marginTop: 32 }}>
					<VacanciesList location="hub" />
				</div>
			</div>
		</ProtectedLayout>
	);
}
