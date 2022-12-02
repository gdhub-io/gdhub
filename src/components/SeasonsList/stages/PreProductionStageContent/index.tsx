import { useEffect, useState } from 'react'
import { Alert, Space, Spin } from 'antd'
import { DateTime } from 'luxon'
import Link from 'next/link'
import useSWR from 'swr'
import styles from './style.module.less'

const fetcher = (url: string, data: any) =>
	fetch(url, { method: 'post', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(
		(res) => res.json()
	)

const PreProductionStageContent = ({ season, stage }: any) => {
	const [mechanicsList, setMechanicsList] = useState<string[]>([])
	const [visualSolutionsList, setVisualSolutionsList] = useState<string[]>([])
	const [genresList, setGenresList] = useState<string[]>([])

	const { data: projectIdeas, isValidating: isLoadingProjecIdeas } = useSWR(
		['/api/season/ideas', { seasonName: season.Name, status: 'Approved' }],
		fetcher
	)

	useEffect(() => {
		if (!projectIdeas) return

		let mechanics: string[] = []
		let visuals: string[] = []
		let genres: string[] = []

		projectIdeas.map((idea: any) => {
			mechanics = [...mechanics, ...idea['Core Mechanics'].split('|')]
			visuals = [...visuals, idea['Visual Style'] + ` (сеттинг: ${idea.Setting})`]
			genres = [...genres, idea['Genre']]
		})

		setMechanicsList(mechanics)
		setVisualSolutionsList(visuals)
		setGenresList(genres)
	}, [projectIdeas])

	const isStageExpired = () => DateTime.fromISO(stage['Finished At']).diffNow().toMillis() <= 0

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					На данном этапе <u>авторы проектов</u> будут прорабатывать все детали своих проектов: описание геймплея, core-
					и meta-механик, интерфейса, персонажей, визуального оформления, монетизации и т.д.
					<br />
					По окончанию текущего этапа мы получим на каждый проект документацию на разработку проекта, а также
					подготовленный питчи проекта для привлечения в команды специалистов на этапе Рекрутинг.
				</p>
				<p>
					Полезный материал:{' '}
					<Link className="text-link" href="#" target="_blank">
						Проработка проекта
					</Link>
					,{' '}
					<Link className="text-link" href="#" target="_blank">
						Работа в команде
					</Link>
					,{' '}
					<Link className="text-link" href="#" target="_blank">
						Шаблон геймдизайн-документа
					</Link>
				</p>

				<Space wrap style={{ marginTop: 20 }}>
					<p>
						<u>Для других специалистов</u> (2D и 3D художников, программистов, левел-дизайнеров) на данном этапе есть
						возможность испытать себя в формате Челенджа. Прокачать свои навыки, показать на что вы способны и как
						работаете. <br />
						Благодаря первому этапу нам известны игровые механики, визуальные стили, платформы, сеттинги будущих игр,
						которые с высокой долей вероятности необходимо будет реализовывать в будущем.
					</p>
					<p>
						Полезный материал:{' '}
						<Link className="text-link" href="#" target="_blank">
							О челлендже для художников
						</Link>
						,{' '}
						<Link className="text-link" href="#" target="_blank">
							О челлендже для программистов
						</Link>
					</p>
				</Space>

				{mechanicsList?.length > 0 && (
					<>
						<h4>Список игровых механик:</h4>
						<p>
							<ol>
								{mechanicsList.map((mechanic: string) => (
									<li key={mechanic}>{mechanic}</li>
								))}
							</ol>
						</p>
					</>
				)}

				{visualSolutionsList?.length > 0 && (
					<>
						<h4>Список визуальных стилей:</h4>
						<p>
							<ol>
								{visualSolutionsList.map((vislual: string) => (
									<li key={vislual}>{vislual}</li>
								))}
							</ol>
						</p>
					</>
				)}

				{genresList?.length > 0 && (
					<>
						<h4>Список жанров:</h4>
						<p>
							<ol>
								{genresList.map((vislual: string) => (
									<li key={vislual}>{vislual}</li>
								))}
							</ol>
						</p>
					</>
				)}

				{isStageExpired() && (
					<Alert
						type="success"
						message="На данный момент идет оценка проектов и питчей. Встретися на следующем этапе."
					/>
				)}
			</Spin>
		</div>
	)
}

export default PreProductionStageContent
