import GameCardList from '@/components/GameCard/GameCardList'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { getWorkedProjects } from '@/services/prisma/queries'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useTranslate } from '@tolgee/react'
import { Typography } from 'antd'
import { GetServerSidePropsContext } from 'next'
import styles from './style.module.scss'

const { Paragraph } = Typography

type ProjectIncludeAll = prismaClient.Project & {
	author: prismaClient.User
	workflow: prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] }
	lastPostAt: Date
	firstPostAt: Date
}
type ProjectsPageParams = { projects: ProjectIncludeAll[] }

const ProjectsPage: NextPageWithLayout<ProjectsPageParams> = ({ projects }) => {
	const { t } = useTranslate()

	return (
		<PublicLayout
			title={t('page.projects.title', 'Video Games')}
			subTitle={t('page.projects.subtitle', 'Projects developed independently by users and teams')}
			seo={{ description: t('Indie games that are developed by platform users and teams') }}
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
			projects: projects.map((p: ProjectIncludeAll) => ({
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
							currentStep: p.workflow.currentStepId || null,
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
