import { useEffect, useState } from 'react'
import { AirtableEmbed } from '@components/AirtableEmbed'
import ProjectIdeaModal from '@components/SeasonsList/modals/ProjectIdeaModal'
import { Alert, Button, Col, Grid, List, Row, Space, Spin, Typography } from 'antd'
import { DateTime } from 'luxon'
import Link from 'next/link'
import useSWR from 'swr'
import styles from './style.module.less'

const fetcher = (url: string, data: any) =>
	fetch(url, { method: 'post', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(
		(res) => res.json()
	)

const PreProductionStageContent = ({ season, stage }: any) => {
	const screens = Grid.useBreakpoint()
	const [mechanicsList, setMechanicsList] = useState<string[]>([])
	const [visualSolutionsList, setVisualSolutionsList] = useState<string[]>([])
	const [genresList, setGenresList] = useState<string[]>([])
	const [showProjectGDDModal, setShowProjectGDDModal] = useState(false)
	const [selectedProjectIdea, setSelectedProjectIdea] = useState<any>(null)

	const { data: projectIdeas, isValidating: isLoadingProjecIdeas } = useSWR(
		['/api/season/ideas', { seasonName: season.Name, status: 'Approved' }],
		fetcher
	)

	const {
		data: authorProjectIdeas,
		mutate: mutateProjectIdeas,
		isValidating: isLoadingAuthorProjecIdeas,
	} = useSWR(['/api/project/ideas', { seasonName: season.Name }], fetcher)

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

	const handleEditIdeaClick = (projectIdeaId: string) => {
		setSelectedProjectIdea(projectIdeaId)
		setShowProjectGDDModal(true)
	}

	const handleSaveProjectGDD = async () => {
		setShowProjectGDDModal(false)
		await mutateProjectIdeas()
	}

	return (
		<div className={styles.container}>
			<h3>Список проектов</h3>
			<AirtableEmbed embedLink="https://airtable.com/embed/shrOzWIGkyejkoDeR?backgroundColor=cyan&layout=card" />

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
				<Link className="text-link" href="/hub/docs/how-make-gdd" target="_blank">
					О разработке ГДД
				</Link>
				,{' '}
				<Link
					className="text-link"
					href="https://docs.google.com/document/d/1uYZCb0AFouICf_ZYLaTVhSyr7hElQlRSixxFEV_HKgM/edit"
					target="_blank"
				>
					Шаблон геймдизайн-документа
				</Link>
			</p>

			{authorProjectIdeas?.data?.length > 0 && (
				<>
					<h3>Мои проекты</h3>
					<List
						itemLayout={screens.xs ? 'vertical' : 'horizontal'}
						loading={isLoadingProjecIdeas}
						size="small"
						style={{ marginTop: '20px' }}
						bordered
						dataSource={authorProjectIdeas?.data}
						renderItem={(projectIdea: any) => (
							<List.Item>
								<List.Item.Meta
									title={
										<>
											{projectIdea.Name}
											<div style={{ opacity: 0.5, fontSize: '11px' }}>{projectIdea.Genre}</div>
										</>
									}
									description={
										<>
											<Typography.Paragraph ellipsis>{projectIdea.Description}</Typography.Paragraph>
											{!screens.md && !!projectIdea['Document Link'] && (
												<Link
													href={projectIdea['Document Link']}
													target="_blank"
													className="text-link"
													style={{ marginRight: '40px' }}
												>
													Концепт
												</Link>
											)}
										</>
									}
								/>
								<Space>
									{screens.md && !!projectIdea['Document Link'] && (
										<Link
											href={projectIdea['Document Link']}
											target="_blank"
											className="text-link"
											style={{ marginRight: '40px' }}
										>
											Концепт
										</Link>
									)}
									<Button onClick={() => handleEditIdeaClick(projectIdea.id)}>Добавить ГДД</Button>
								</Space>
							</List.Item>
						)}
					/>
				</>
			)}

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
					<Link className="text-link" href="/hub/docs/about-art-challenge" target="_blank">
						Для 2D-художников
					</Link>
					,{' '}
					<Link className="text-link" href="/hub/docs/about-3dart-challenge" target="_blank">
						Для 3D-художников
					</Link>
					,{' '}
					<Link className="text-link" href="/hub/docs/about-code-challenge" target="_blank">
						Для программистов
					</Link>
				</p>
			</Space>
			<Row wrap>
				<Col span={12}>
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
				</Col>
				<Col span={12}>
					{/* <Row>
							<Col> */}
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
					{/* </Col>
							<Col> */}
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
					{/* </Col>
						</Row> */}
				</Col>
			</Row>
			{isStageExpired() && (
				<Alert type="success" message="На данный момент идет оценка проектов и питчей. Встретися на следующем этапе." />
			)}

			<ProjectIdeaModal
				seasonId={season.id}
				projectIdeaId={selectedProjectIdea}
				open={showProjectGDDModal}
				onOk={handleSaveProjectGDD}
				onCancel={() => setShowProjectGDDModal(false)}
			/>
		</div>
	)
}

export default PreProductionStageContent
