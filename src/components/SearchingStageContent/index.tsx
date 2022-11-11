import { useState } from 'react'
import ProjectIdeaModal from '@components/SeasonsList/modals/ProjectIdeaModal'
import { Button, List, message, Popconfirm, Space, Spin, Typography } from 'antd'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { HiOutlineTrash } from 'react-icons/hi'
import useSWR from 'swr'

const fetcher = (url: string, data: any) =>
	fetch(url, { method: 'post', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(
		(res) => res.json()
	)

const SearchingStageContent = ({ season }: any) => {
	const session: any = useSession()
	const [showProjectIdeaModal, setShowProjectIdeaModal] = useState(false)
	const [selectedProjectIdea, setSelectedProjectIdea] = useState<any>(null)
	const { data: projectIdeas, mutate: mutateProjectIdeas } = useSWR(
		['/api/project/ideas', { seasonName: season.Name }],
		fetcher
	)

	const handleAddIdeaClick = () => {
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

	return (
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
			</p>
			<Button key="add-game-idea" onClick={handleAddIdeaClick}>
				Добавить идею игры
			</Button>

			{projectIdeas?.length > 0 && (
				<List
					size="small"
					style={{ marginTop: '20px' }}
					bordered
					dataSource={projectIdeas}
					renderItem={(projectIdea: any) => (
						<List.Item>
							<List.Item.Meta
								title={
									<>
										{projectIdea.Name}
										<div style={{ opacity: 0.5, fontSize: '11px' }}>{projectIdea.Status}</div>
									</>
								}
								description={<Typography.Paragraph ellipsis>{projectIdea.Description}</Typography.Paragraph>}
							/>
							<Space>
								<Link
									href={projectIdea['Document Link']}
									target="_blank"
									className="text-link"
									style={{ marginRight: '40px' }}
								>
									Ссылка на документ
								</Link>
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
				onOk={() => setShowProjectIdeaModal(false)}
				onCancel={() => setShowProjectIdeaModal(false)}
			/>
		</Spin>
	)
}

export default SearchingStageContent
