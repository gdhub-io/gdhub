"use client";

import { useTranslate } from "@tolgee/react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import styles from "@/pages/hub/jobs/style.module.scss";

const ProtectedLayout = dynamic(
	() => import("@/layouts/ProtectedLayout").then((m) => m.ProtectedLayout),
	{ ssr: false },
);
const VacanciesList = dynamic(() => import("@/components/VacanciesList"), {
	ssr: false,
});

export default function HubJobsPage() {
	const { t } = useTranslate();
	const pathname = usePathname();

	return (
		<ProtectedLayout
			title={t("page.vacancies.title", "Jobs")}
			subTitle={t(
				"page.vacancies.subTitle",
				"Invest your time in the success of new game projects",
			)}
			seo={{ openGraph: { type: "website", url: pathname ?? undefined } }}
		>
			<div className={styles.container}>
				<div className="project-vacancies" style={{ marginTop: 32 }}>
					<VacanciesList location="hub" />
				</div>
			</div>
		</ProtectedLayout>
	);
}
