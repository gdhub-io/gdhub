import GameCardList from '@/components/GameCard/GameCardList'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { getWorkedProjects } from '@/services/prisma/queries'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useTolgee } from '@tolgee/react'
import { Typography } from 'antd'
import { GetServerSidePropsContext } from 'next'
import styles from './style.module.scss'

const { Paragraph } = Typography

type ProjectIncludeAll = prismaClient.Project & {
	author: prismaClient.User
	workflow: prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] }
}
type ProjectsPageParams = { projects: ProjectIncludeAll[] }

const ProjectsPage: NextPageWithLayout<ProjectsPageParams> = ({ projects }) => {
	const { t } = useTolgee()

	return (
		<PublicLayout
			title={t('page.projects.title', 'Indie Game Projects')}
			subTitle={t('page.projects.subtitle', 'Projects developed independently by users')}
			seo={{ description: t('Indie games that are developed by platform users') }}
		>
			<div className={styles.container}>
				{!projects.length && <Paragraph type="secondary">There are no projects available to view</Paragraph>}
				<GameCardList games={projects} loading={false} />
			</div>
		</PublicLayout>
	)
}

export const getStaticProps = async (context: GetServerSidePropsContext) => {
	const projects = await getWorkedProjects()

	return {
		props: {
			projects: projects.map((p) => ({
				...p,
				createdAt: p.createdAt?.toISOString() || null,
				updatedAt: p.updatedAt?.toISOString() || null,
				startedAt: p.startedAt?.toISOString() || null,
				finishedAt: p.finishedAt?.toISOString() || null,
				lastPostAt: p.lastPostAt?.toISOString() || null,
				firstPostAt: p.firstPostAt?.toISOString() || null,
				author: {
					...p.author,
					createdAt: p.author.createdAt?.toISOString() || null,
					updatedAt: p.author.updatedAt?.toISOString() || null,
				},
				workflow: p.workflow
					? {
							...p.workflow,
							createdAt: p.workflow.createdAt?.toISOString() || null,
							updatedAt: p.workflow.updatedAt?.toISOString() || null,
							currentStep: p.workflow.currentStep,
							steps:
								p.workflow.steps?.map((step: prismaClient.ProjectWorkflowStep) => ({
									...step,
									createdAt: step.createdAt?.toISOString() || null,
									updatedAt: step.updatedAt?.toISOString() || null,
								})) || [],
						}
					: null,
			})),
		},
		revalidate: 60,
	}
}

export default ProjectsPage
