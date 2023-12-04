import { useMemo } from 'react'
import { SeasonData } from '@/components/SeasonContent'
import { StageProjectsSection } from '@/components/StageProjectsSection'
import { Render } from '@9gustin/react-notion-render'
import { ProjectStatus } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Skeleton, Spin } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const RecruitingStageContent = ({ season }: { season: SeasonData }) => {
	const router = useRouter()
	const stage = useMemo(() => {
		return season?.stages.find((s) => s.isCurrent)
	}, [season])

	const { data: stageContent, isLoading } = useQuery(
		['gamelab-recruiting-content'],
		() => axios.post(`/api/notion/page`, { table: 'gamelab-pipeline', lang: router.locale, pageSlug: stage?.name }),
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

				{!!stage && <StageProjectsSection stageId={stage.id} status={ProjectStatus.Approved} />}
			</Spin>
		</div>
	)
}

export default RecruitingStageContent
