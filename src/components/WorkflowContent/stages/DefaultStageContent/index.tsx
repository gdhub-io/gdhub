import { useMemo, useState } from 'react'
import { SeasonData } from '@/components/WorkflowContent'
import { Render } from '@9gustin/react-notion-render'
import { SeasonStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Button, Skeleton, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const DefaultStageContent = ({ stage }: { stage: SeasonStage }) => {
	const router = useRouter()
	const [pageProperties, setPageProperties] = useState<any>()

	const { data: stageContent, isLoading } = useQuery(
		['gamelab-recruiting-content', stage?.id],
		() => axios.post(`/api/notion/page`, { table: 'gamelab-pipeline', locale: router.locale, pageSlug: stage?.name }),
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
