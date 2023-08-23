import { useMemo } from 'react'
import { SeasonData } from '@/components/SeasonContent'
import { SeasonProjectsSection } from '@/components/SeasonProjectsSection'
import { StageProjectsSection } from '@/components/StageProjectsSection'
import { Spin } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'

const RecruitingStageContent = ({ season }: { season: SeasonData }) => {
	const stage = useMemo(() => {
		return season?.stages.find((s) => s.isCurrent)
	}, [season])

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					Проекты проработаны, пора формировать команды. Для этого каждый участник Геймхаба может изучить доступные
					проекты, вакансии и оставить заявку на участие. Специалисты, которые заинтересуют лидеров команд (авторов
					проектов), получат от них приглашение на собеседование.
				</p>
				<p>
					Полезный материал:{' '}
					<Link className="text-link" href="/hub/docs/about-recruiting" target="_blank">
						Как попасть на проект
					</Link>
				</p>

				<h3>Проекты</h3>
				{!!stage && <StageProjectsSection stageId={stage.id} />}
			</Spin>
		</div>
	)
}

export default RecruitingStageContent
