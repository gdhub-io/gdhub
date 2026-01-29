import { useTranslate } from "@tolgee/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const ProtectedLayout = dynamic(
	() => import("@/layouts/ProtectedLayout").then((m) => m.ProtectedLayout),
	{ ssr: false },
);
const VacanciesList = dynamic(() => import("@/components/VacanciesList"), {
	ssr: false,
});

const VacanciesPage: NextPageWithLayout = ({ projects }: any) => {
	const router = useRouter();
	const { t } = useTranslate();

	return (
		<ProtectedLayout
			title={t("page.vacancies.title", "Jobs")}
			subTitle={t(
				"page.vacancies.subTitle",
				"Invest your time in the success of new game projects",
			)}
			seo={{ openGraph: { type: "website", url: router.asPath } }}
		>
			<div className={styles.container}>
				<div className="project-vacancies" style={{ marginTop: 32 }}>
					<VacanciesList location="hub" />
				</div>
			</div>
		</ProtectedLayout>
	);
};

export default VacanciesPage;
