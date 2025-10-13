"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const GameCardList = dynamic(
	() => import("@/components/GameCard/GameCardList"),
	{ ssr: false },
);

const { Paragraph } = Typography;

/**
 * Projects page component that displays a list of indie game projects
 *
 * @returns {JSX.Element} Rendered component
 */
const ProjectsPage: NextPageWithLayout = () => {
	const { t } = useTranslate();
	const { data: session } = useSession();

	const {
		data: projects,
		isSuccess,
		isLoading,
	} = useQuery({
		queryKey: ["projects"],
		queryFn: () => axios.get("/api/projects"),
		enabled: !!session?.user,
	});

	return (
		<ProtectedLayout
			title={t("page.hab.projects.title", "Indie Game Projects")}
			subTitle={t(
				"page.hab.projects.subtitle",
				"Projects developed independently by users",
			)}
		>
			<div className={styles.container}>
				{!isSuccess && !isLoading && (
					<Paragraph type="secondary">
						There are no projects available to view
					</Paragraph>
				)}

				<GameCardList games={projects?.data || []} loading={isLoading} />
			</div>
		</ProtectedLayout>
	);
};

export default ProjectsPage;
