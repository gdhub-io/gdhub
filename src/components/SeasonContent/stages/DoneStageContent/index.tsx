import { useMemo } from 'react'
import { SeasonProjectsSection } from '@/components/SeasonProjectsSection'
import { fetcher } from '@/helpers/fetcher'
import { Grid, Spin } from 'antd'
import useSWR from 'swr'
import styles from './style.module.scss'

const DoneStageContent = ({ season }: any) => {
	const screens = Grid.useBreakpoint()
	const stage = useMemo(() => {
		return season?.stages.find((s: { isCurrent: boolean }) => s.isCurrent)
	}, [season])

	const { data: projects } = useSWR({ url: '/api/season/projects', data: { seasonName: season.Name } }, fetcher)

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					Данный сезон подошел к концу. Большое спасибо всем участникам.
					<br />
					Ниже можно посмотреть проекты, которые запустились в рамках текущго сезона. А также следите за обновлениями
					понравившихся проектов и инвестируйте в них ;)
				</p>

				<h3>Проекты</h3>
				{!!stage && <SeasonProjectsSection seasonId={season.id} />}
			</Spin>
		</div>
	)
}

export default DoneStageContent
