import { useMemo } from 'react'
import { Render } from '@9gustin/react-notion-render'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Skeleton, Spin } from 'antd'
import axios from 'axios'
import styles from './style.module.scss'

const prepareContentRequest = (step: prismaClient.ProjectWorkflowStep) => {
	const [source, path] = step.description?.split('::') || []

	if (source === 'notion' && path) {
		const [table, slug] = path?.split('.')

		return { source, table, slug }
	}

	return null
}

const WorkflowStepContent = ({ step, locale = 'en' }: { step: prismaClient.ProjectWorkflowStep; locale?: string }) => {
	const { getLanguage } = useTolgee()
	const contentRequest = useMemo(() => prepareContentRequest(step), [step])

	const {
		data: content,
		isLoading,
		refetch: refetchContent,
	} = useQuery(
		['workflow-step-content', step?.id],
		() =>
			axios.post(`/api/notion/page`, {
				table: contentRequest?.table,
				locale: locale || getLanguage(),
				pageSlug: contentRequest?.slug,
			}),
		{
			enabled: !!contentRequest,
			refetchInterval: false,
			refetchOnWindowFocus: false,
		}
	)

	if (!step) return null

	return (
		<div className={styles.container}>
			<Spin spinning={!step}>
				<Skeleton active title={false} paragraph={{ rows: 4 }} loading={isLoading}>
					<Render emptyBlocks blocks={content?.data} classNames useStyles simpleTitles />
				</Skeleton>
			</Spin>
		</div>
	)
}

export default WorkflowStepContent
