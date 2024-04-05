import { useMemo } from 'react'
import { SeasonData } from '@/components/WorkflowContent'
import { Render } from '@9gustin/react-notion-render'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Button, Skeleton, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const PitchingStageContent = ({ season }: { season: SeasonData }) => {
	const router = useRouter()
	const stage = useMemo(() => {
		return season?.stages.find((s) => s.isCurrent)
	}, [season])

	const { data: stageContent, isLoading } = useQuery(
		['gamelab-recruiting-content'],
		() => axios.post(`/api/notion/page`, { table: 'gamelab-pipeline', locale: router.locale, pageSlug: stage?.name }),
		{
			enabled: !!stage,
			refetchInterval: false,
			refetchOnWindowFocus: false,
		}
	)

	if (!season) return null

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<Skeleton active title={false} paragraph={{ rows: 4 }} loading={isLoading}>
					<Render blocks={stageContent?.data} classNames useStyles simpleTitles />
				</Skeleton>

				<p>
					<T
						keyName="pitches-will-at-date-on-our-channel"
						params={{
							date: dayjs(stage?.finishedAt).format('ll'),
						}}
					/>{' '}
					<Link href="https://www.youtube.com/channel/UCKesPh-gDVTaHrT_HDUWkeQ" target="_blank">
						Youtube
					</Link>
					.
				</p>
				<Link href={`/${season.slug}/demo-day`} target="_blank">
					<Button type="primary">
						<T keyName="resigration-to-demoday" />
					</Button>
				</Link>
			</Spin>
		</div>
	)
}

export default PitchingStageContent
