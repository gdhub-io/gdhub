import { useState } from 'react'
import ProjectIdeaModal from '@components/SeasonsList/modals/ProjectIdeaModal'
import { hasRole } from '@helpers/user'
import { Button, Grid, List, message, Popconfirm, Space, Spin, Typography } from 'antd'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { HiOutlineTrash } from 'react-icons/hi'
import useSWR from 'swr'
import styles from './style.module.less'

const fetcher = (url: string, data: any) =>
	fetch(url, { method: 'post', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(
		(res) => res.json()
	)

const SearchingStageContent = ({ season }: any) => {
	const screens = Grid.useBreakpoint()
	const session: any = useSession()
	const [showProjectIdeaModal, setShowProjectIdeaModal] = useState(false)
	const [selectedProjectIdea, setSelectedProjectIdea] = useState<any>(null)
	const {
		data: projectIdeas,
		mutate: mutateProjectIdeas,
		isValidating: isLoadingProjecIdeas,
	} = useSWR(['/api/project/ideas', { seasonName: season.Name }], fetcher)

	const handleAddIdeaClick = () => {
		setSelectedProjectIdea(null)
		setShowProjectIdeaModal(true)
	}

	const handleEditIdeaClick = (projectIdeaId: string) => {
		setSelectedProjectIdea(projectIdeaId)
		setShowProjectIdeaModal(true)
	}

	const handleDeleteIdea = async (projectIdeaId: string) => {
		try {
			const response = await fetch('/api/project/idea/delete', {
				method: 'post',
				body: JSON.stringify({ projectIdeaId }),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			if (!response.ok) throw new Error()

			await mutateProjectIdeas()
			message.success('Идея проекта была удалена')
		} catch (error: any) {
			message.error('Error')
		}
	}

	const handleSaveProjectIdea = async () => {
		setShowProjectIdeaModal(false)
		await mutateProjectIdeas()
	}

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					На данном этапе потенциальные авторы игровых проектов исследуют тренды, генерируют идеи, анализируют
					существующие игры. Лучшие свои идеи игр они регистрируют нажав кнопку &quot;Добавить идею игры&quot;
				</p>
				<p>
					Полезный материал:{' '}
					<Link className="text-link" href="/hub/docs/work-with-ideas" target="_blank">
						Работа с идеями
					</Link>
					,{' '}
					<Link
						className="text-link"
						href="https://docs.google.com/document/d/1O99XaTb__f3rL8biPGDEf4H6U7xKQKQag5oWCp3ljhk/edit?usp=sharing"
						target="_blank"
					>
						Шаблон документа для описания идеи
					</Link>
				</p>
				<Space>
					<Button type="primary" onClick={handleAddIdeaClick}>
						Добавить идею игры
					</Button>

					{hasRole('mentor', session) && (
						<Link href={`/hub/season/${season.Slug}/ideas`}>
							<Button>Список идей</Button>
						</Link>
					)}

					{projectIdeas?.total > 3 && (
						<span className="additional-info">Всего участники предложили {projectIdeas.total} идей</span>
					)}
				</Space>

				{projectIdeas?.data?.length > 0 && (
					<List
						itemLayout="vertical"
						loading={isLoadingProjecIdeas}
						size="small"
						style={{ marginTop: '20px' }}
						bordered
						dataSource={projectIdeas?.data}
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
											{screens.xs && (
												<Link
													href={projectIdea['Document Link']}
													target="_blank"
													className="text-link"
													style={{ marginRight: '40px' }}
												>
													Ссылка на документ
												</Link>
											)}
										</>
									}
								/>
								<Space>
									{screens.md && (
										<Link
											href={projectIdea['Document Link']}
											target="_blank"
											className="text-link"
											style={{ marginRight: '40px' }}
										>
											Ссылка на документ
										</Link>
									)}
									<Button onClick={() => handleEditIdeaClick(projectIdea.id)}>Изменить</Button>
									<Popconfirm
										title="Точно хотите удалить？"
										okText="Да"
										cancelText="Нет"
										onConfirm={() => handleDeleteIdea(projectIdea.id)}
									>
										<Button type="text" danger>
											<HiOutlineTrash />
										</Button>
									</Popconfirm>
								</Space>
							</List.Item>
						)}
					/>
				)}

				<ProjectIdeaModal
					seasonId={season.id}
					projectIdeaId={selectedProjectIdea}
					open={showProjectIdeaModal}
					onOk={handleSaveProjectIdea}
					onCancel={() => setShowProjectIdeaModal(false)}
				/>
			</Spin>
		</div>
	)
}

export default SearchingStageContent
