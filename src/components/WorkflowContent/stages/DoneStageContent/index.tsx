import { useMemo } from 'react'
import { SeasonProjectsSection } from '@/components/SeasonProjectsSection'
import { Render } from '@9gustin/react-notion-render'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Grid, Skeleton, Spin } from 'antd'
import axios from 'axios'
import styles from './style.module.scss'

const DoneStageContent = ({ season }: any) => {
	const { getLanguage } = useTolgee()
	const screens = Grid.useBreakpoint()
	const stage = useMemo(() => {
		return season?.stages.find((s: { isCurrent: boolean }) => s.isCurrent)
	}, [season])

	const { data: stageContent, isLoading } = useQuery(
		['gamelab-recruiting-content'],
		() => axios.post(`/api/notion/page`, { table: 'gamelab-pipeline', locale: getLanguage(), pageSlug: stage?.name }),
		{
			enabled: !!stage,
			refetchInterval: false,
			refetchOnWindowFocus: false,
		}
	)

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<Skeleton active title={false} paragraph={{ rows: 4 }} loading={isLoading}>
					<Render blocks={stageContent?.data} classNames useStyles simpleTitles />
				</Skeleton>

				{!!stage && <SeasonProjectsSection seasonId={season.id} />}
			</Spin>
		</div>
	)
}

export default DoneStageContent
