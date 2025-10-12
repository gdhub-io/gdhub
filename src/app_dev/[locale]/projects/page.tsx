import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import GameCardList from "@/components/GameCard/GameCardList";
import { PublicLayout } from "@/layouts/PublicLayout";
import { getWorkedProjects } from "@/services/prisma/queries";
import styles from "./style.module.scss";

export const revalidate = 60;

type ProjectIncludeAll = prismaClient.Project & {
	author: prismaClient.User;
	workflow: prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] };
	lastPostAt: Date;
	firstPostAt: Date;
};

async function getProjects() {
	const projects = await getWorkedProjects();
	return projects as ProjectIncludeAll[];
}

const { Paragraph } = Typography;

export default async function ProjectsPage() {
	const projects = await getProjects();
	const { t } = useTranslate();
	return (
		<PublicLayout
			title={t("page.projects.title", "Video Games")}
			subTitle={t("page.projects.subtitle", "Projects developed independently by users and teams")}
			seo={{ description: t("Indie games that are developed by platform users and teams") }}
		>
			<div className={styles.container}>
				{!projects.length && (
					<Paragraph type="secondary">There are no projects available to view</Paragraph>
				)}
				<GameCardList games={projects as any} loading={false} />
			</div>
		</PublicLayout>
	);
}
