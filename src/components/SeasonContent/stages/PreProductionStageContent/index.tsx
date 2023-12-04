import { useMemo } from 'react'
import { SeasonData } from '@/components/SeasonContent'
import { StageProjectsSection } from '@/components/StageProjectsSection'
import { UserSeasonProjectsList } from '@/components/UserSeasonProjectsList'
import { Render } from '@9gustin/react-notion-render'
import { ProjectStatus } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Alert } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const PreProductionStageContent = ({ season }: { season: SeasonData }) => {
	const router = useRouter()
	const stage = useMemo(() => {
		return season?.stages.find((s) => s.isCurrent)
	}, [season])

	const { data: stageContent, isLoading } = useQuery(
		['gamelab-preproduction-content'],
		() => axios.post(`/api/notion/page`, { table: 'gamelab-pipeline', lang: router.locale, pageSlug: stage?.name }),
		{
			enabled: !!stage,
			refetchInterval: false,
			refetchOnWindowFocus: false,
		}
	)

	return (
		<div className={styles.container}>
			<Render blocks={stageContent?.data} classNames useStyles simpleTitles />

			<UserSeasonProjectsList seasonId={season.id} status={ProjectStatus.Registered} />

			{/* {mechanicsList?.length > 0 && (
				<>
					<h4>Список игровых механик:</h4>
					<p style={{ lineHeight: '26px' }}>
						{mechanicsList.map((mechanic: string, idx: number) => (
							<Text code key={mechanic + idx}>
								{mechanic}
							</Text>
						))}
					</p>
				</>
			)} */}

			{/* {visualSolutionsList?.length > 0 && (
				<>
					<h4>Список визуальных стилей:</h4>
					<p>
						<ol>
							{visualSolutionsList.map((vislual: string, idx: number) => (
								<li key={vislual + idx}>
									<Text code>{vislual}</Text>
								</li>
							))}
						</ol>
					</p>
				</>
			)} */}

			{!!stage && <StageProjectsSection stageId={stage.id} status={ProjectStatus.Approved} />}

			{stage?.isCompleted && (
				<Alert style={{ marginTop: 16 }} type="success" message={<T keyName="projects-currently-being-assessed" />} />
			)}
		</div>
	)
}

export default PreProductionStageContent
