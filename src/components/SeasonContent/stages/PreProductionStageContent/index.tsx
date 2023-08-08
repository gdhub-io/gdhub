import { useMemo } from 'react'
import { SeasonData } from '@/components/SeasonContent'
import { SeasonProjectsSection } from '@/components/SeasonProjectsSection'
import { UserSeasonProjectsList } from '@/components/UserSeasonProjectsList'
import { ProjectStatus } from '@prisma/client'
import { Alert, Space } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'

const PreProductionStageContent = ({ season }: { season: SeasonData }) => {
	const stage = useMemo(() => {
		return season?.stages.find((s) => s.isCurrent)
	}, [season])

	return (
		<div className={styles.container}>
			<h3>Для авторов</h3>
			<p>
				На данном этапе авторы проектов будут прорабатывать все детали своих проектов: описание геймплея, core- и
				meta-механик, интерфейса, персонажей, визуального оформления, монетизации и т.д.
				<br />
				По окончанию текущего этапа мы получим на каждый проект документацию на разработку проекта, а также
				подготовленный питчи проекта для привлечения в команды специалистов на этапе Рекрутинг.
			</p>
			<p>
				Полезный материал:{' '}
				<Link href="/hub/docs/how-make-gdd" target="_blank">
					О разработке ГДД
				</Link>
				,{' '}
				<Link
					href="https://docs.google.com/document/d/1uYZCb0AFouICf_ZYLaTVhSyr7hElQlRSixxFEV_HKgM/edit"
					target="_blank"
				>
					Шаблон геймдизайн-документа
				</Link>
			</p>

			<>
				<h3>Мои проекты</h3>
				<UserSeasonProjectsList seasonId={season.id} status={ProjectStatus.Registered} />
			</>

			<Space wrap style={{ marginTop: 20 }}>
				<h3>Для специалистов</h3>
				<p>
					Для других специалистов (2D и 3D художников, программистов) на данном этапе есть возможность испытать себя в
					формате Челенджа. Прокачать свои навыки, показать на что вы способны и как работаете. <br />
					Благодаря первому этапу нам известны игровые механики, визуальные стили, платформы, сеттинги будущих игр,
					которые с высокой долей вероятности необходимо будет реализовывать в будущем.
				</p>

				<p>
					Полезный материал:{' '}
					<Link href="/hub/docs/about-art-challenge" target="_blank">
						Для 2D-художников
					</Link>
					,{' '}
					<Link href="/hub/docs/about-3dart-challenge" target="_blank">
						Для 3D-художников
					</Link>
					,{' '}
					<Link href="/hub/docs/about-code-challenge" target="_blank">
						Для программистов
					</Link>
				</p>
			</Space>

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

			<h3>Список проектов</h3>
			{!!stage && <SeasonProjectsSection stageId={stage.id} status={ProjectStatus.Approved} />}

			{stage?.isCompleted && (
				<Alert
					style={{ marginTop: 16 }}
					type="success"
					message="На данный момент идет оценка проектов и питчей. Встретимся на следующем этапе."
				/>
			)}
		</div>
	)
}

export default PreProductionStageContent
