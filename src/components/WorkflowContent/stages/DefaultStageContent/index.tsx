import { Render } from '@9gustin/react-notion-render'
import { SeasonStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Skeleton, Spin } from 'antd'
import axios from 'axios'
import styles from './style.module.scss'

const DefaultStageContent = ({ stage, locale = 'en' }: { stage: SeasonStage; locale?: string }) => {
	const { getLanguage } = useTolgee()

	const { data: stageContent, isLoading } = useQuery(
		['gamelab-recruiting-content', stage?.id],
		() =>
			axios.post(`/api/notion/page`, {
				table: 'gamelab-pipeline',
				locale: locale || getLanguage(),
				pageSlug: stage?.name,
			}),
		{
			enabled: !!stage,
			refetchInterval: false,
			refetchOnWindowFocus: false,
		}
	)

	if (!stage) return null

	return (
		<div className={styles.container}>
			<Spin spinning={!stage}>
				<Skeleton active title={false} paragraph={{ rows: 4 }} loading={isLoading}>
					<Render blocks={stageContent?.data} classNames useStyles simpleTitles />
				</Skeleton>
			</Spin>
		</div>
	)
}

export default DefaultStageContent
