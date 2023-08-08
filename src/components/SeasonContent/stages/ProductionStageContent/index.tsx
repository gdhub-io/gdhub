import { useMemo } from 'react'
import { SeasonData } from '@/components/SeasonContent'
import { SeasonProjectsSection } from '@/components/SeasonProjectsSection'
import { ProjectStatus, SeasonStreamReport } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Space, Spin, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import styles from './style.module.scss'

const ProductionStageContent = ({ season }: { season: SeasonData }) => {
	const stage = useMemo(() => {
		return season.stages.find((s) => s.isCurrent)
	}, [season])

	const { data: reportsDates } = useQuery(
		['season-reports', stage?.id],
		() => axios.get<SeasonStreamReport[]>('/api/season/stream-reports', { params: { stageId: stage?.id } }),
		{ enabled: !!stage, refetchOnWindowFocus: false, staleTime: Infinity }
	)

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					Проекты находятся на основном этапе разработки. Команды сформированы и показали, что могут выдвать результат.
					Авторы проектов поняли какие ресурсы у них есть и что они смогут реализовать за оставшиеся 2 месяца. Прототипы
					и наброски визуала практически есть. Наращиваем темпы и выдаем крутой результат!
				</p>
				<p>
					Продолжаем следить за проектами через их онлайн-отчеты. Информация о видеоотчетах будет публиковаться в чате
					сообщества.
					<ul>
						{reportsDates?.data.map((reportDate, index) => (
							<li key={`report-date-${index}`}>
								{dayjs(reportDate.date).format('LLL')}
								<Typography.Text type="secondary">
									<small>{' ' + dayjs(reportDate.date).format('Z')}</small>
								</Typography.Text>
							</li>
						))}
					</ul>
				</p>
				<p>
					Полезный материал: <br />
					<Space wrap direction="vertical">
						<Link className="text-link" href="https://www.youtube.com/watch?v=mnkf-u0Fkws" target="_blank">
							Арт-дирекшн от А до Я
						</Link>
						<Link className="text-link" href="https://www.youtube.com/watch?v=Jht-a_ZuOfA" target="_blank">
							Мобильный арт. Пайплайн создания графики для игр
						</Link>
						<Link className="text-link" href="https://www.youtube.com/watch?v=Ax7Vn4KlgcM" target="_blank">
							Простые шаги для сочной игры
						</Link>
						<Link className="text-link" href="/hub/docs/spring-reporting" target="_blank">
							Как готовиться к отчету
						</Link>
					</Space>
				</p>

				<h3>Проекты в разработке</h3>
				{!!stage && <SeasonProjectsSection stageId={stage.id} status={ProjectStatus.Approved} />}
			</Spin>
		</div>
	)
}

export default ProductionStageContent
