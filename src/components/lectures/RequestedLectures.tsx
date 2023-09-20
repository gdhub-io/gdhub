import { useState } from 'react'
import LectureDetailsModal from '@/components/modals/LectureDetailsModal'
import LectureRequestModal from '@/components/modals/LectureRequestModal'
import PropositionLectureModal from '@/components/modals/PropositionLectureModal'
import SetLecturerModal from '@/components/modals/SetLecturerModal'
import { lectureStatusAsText } from '@/helpers/format'
import { Lecture, LectureListener, LectureStage, LecturerRequest, User, WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Dropdown, Grid, Popconfirm, Space, Spin, Table, Tooltip, Typography, message } from 'antd'
import { ItemType } from 'antd/lib/menu/hooks/useItems'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { FaChalkboardTeacher } from 'react-icons/fa'
import { HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import { TbHeartOff, TbHeart, TbDotsVertical } from 'react-icons/tb'

const { Title } = Typography

const mobileMenu: ItemType[] = [
	{
		label: 'Изменить',
		key: 'edit',
	},
	{
		label: 'Удалить',
		key: 'delete',
	},
]

export const RequestedLectures = ({ onChange = () => {} }: { onChange?: () => void }) => {
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()
	// State
	const [selectedLectureId, setSelectedLectureId] = useState<string>()
	const [showLectureDetails, setShowLectureDetails] = useState(false)
	const [showSetLecturerModal, setShowSetLecturerModal] = useState(false)
	const [showLectureRequestModal, setShowLectureRequestModal] = useState(false)
	const [showPropositionLectureModal, setShowPropositionLectureModal] = useState(false)
	// Queries & mutations
	const { mutateAsync: createListener } = useMutation(
		(params: { lectureId: string }) => axios.post('/api/user/lecture/listener', undefined, { params }),
		{
			onSuccess: () => {
				updateList()
			},
		}
	)
	const { mutateAsync: deleteListener } = useMutation(
		(params: { lectureId: string }) => axios.delete('/api/user/lecture/listener', { params }),
		{
			onSuccess: () => {
				updateList()
			},
		}
	)

	const { mutateAsync: deleteLecture } = useMutation(
		({ id }: { id: string }) => axios.delete('/api/user/lecture', { params: { id } }),
		{
			onSuccess: () => {
				updateList()
			},
		}
	)

	const { mutateAsync: deleteLecturerRequest } = useMutation(
		({ id, lectureId }: { id: string; lectureId: string }) =>
			axios.delete(`/api/user/lecture/${lectureId}/lecturer/${id}`),
		{
			onSuccess: () => {
				updateList()
			},
		}
	)

	const { data: workDirections } = useQuery(
		['workDirections'],
		() => axios.get<WorkDirection[]>('/api/dictionary/work-directions'),
		{
			staleTime: Infinity,
		}
	)

	const {
		data: requestedLectures,
		refetch: updateList,
		isLoading,
	} = useQuery(['lectures', 'requested'], () =>
		axios.get<
			(Lecture & {
				listeners: LectureListener[]
				direction: WorkDirection
				lecturerRequests: (LecturerRequest & { user: User })[]
				isRelevant: boolean
				isAuthor: boolean
			})[]
		>('/api/lectures', {
			params: { stage: [LectureStage.Requested, LectureStage.Actualized].join(',') },
		})
	)

	const columns: ColumnsType<
		Lecture & {
			listeners: LectureListener[]
			direction: WorkDirection
			lecturerRequests: (LecturerRequest & { user: User })[]
			isRelevant: boolean
			isAuthor: boolean
		}
	> = [
		{
			title: 'Тема лекции',
			dataIndex: 'name',
			key: 'name',
			width: screens.lg ? 'auto' : '100%',
			render: (text, lecture) =>
				screens.md ? (
					<div
						style={{ cursor: 'pointer' }}
						onClick={() => {
							setSelectedLectureId(lecture.id)
							setShowLectureDetails(true)
						}}
					>
						<strong>{text}</strong>
						<br />
						<small>{lectureStatusAsText(lecture.stage)}</small>
					</div>
				) : (
					<div
						style={{ cursor: 'pointer' }}
						onClick={() => {
							setSelectedLectureId(lecture.id)
							setShowLectureDetails(true)
						}}
					>
						<strong>{text}</strong>
						<br />
						<small>{lecture.direction.name}</small>
					</div>
				),
		},
		{
			title: 'Направление',
			dataIndex: 'directionId',
			key: 'directionId',
			responsive: ['md'],
			render(value) {
				const direction = workDirections?.data.find((direction) => direction.id == value)
				return direction?.name || 'unknown'
			},
		},
		{
			title: screens.lg ? 'Лектор' : null,
			responsive: ['md'],
			key: 'Lecturer Name',
			render: (data: any, lecture) => {
				const applicatnsCount = lecture.listeners?.length || 0
				const speaker = lecture.lecturerRequests?.find((l) => l.isSpeaker)
				const myLecturerRequest = lecture.lecturerRequests.find((r) => r.userId == session?.user.id)

				if (speaker) {
					return speaker.user.name
				} else {
					return applicatnsCount >= 1 ? (
						<>
							{myLecturerRequest ? (
								<Space>
									<Button
										type="primary"
										onClick={(e) => {
											e.preventDefault()
											handleSetLecturer(lecture?.id)
										}}
									>
										<Space align="center">
											<FaChalkboardTeacher style={{ position: 'relative', top: '2px' }} /> Мое предложение
										</Space>
									</Button>
									<Popconfirm
										title="Уверены?"
										okText="Да"
										cancelText="Нет"
										onConfirm={() => handleDeleteLecturerRequest(lecture.id, myLecturerRequest.id)}
									>
										<Tooltip title="Не хочу быть лектором">
											<Button type="text">
												<HiOutlineX />
											</Button>
										</Tooltip>
									</Popconfirm>
								</Space>
							) : (
								<Button type="primary" onClick={() => handleSetLecturer(lecture?.id)}>
									<Space align="center">
										<FaChalkboardTeacher style={{ position: 'relative', top: '2px' }} /> Стать лектором
									</Space>
								</Button>
							)}
						</>
					) : (
						<small>Пока нет, ждем больше желающих</small>
					)
				}
			},
		},
		{
			title: null,
			key: 'join-to-lecture',
			render: (_, lecture) => (
				<Space direction="vertical">
					{lecture.isRelevant ? (
						<Space align="center">
							Aктуально
							<Tooltip title="Уже не актуально">
								<Button type="text" onClick={() => handleSetRelevantForMe(lecture.id, false)}>
									<TbHeartOff style={{ position: 'relative', top: '2px' }} />
								</Button>
							</Tooltip>
						</Space>
					) : (
						<Button type="primary" onClick={() => handleSetRelevantForMe(lecture.id, true)}>
							<Space align="center">
								<TbHeart style={{ position: 'relative', top: '2px' }} /> Хочу посетить
							</Space>
						</Button>
					)}
					{lecture.listeners.length >= 3 && <small>актульно {lecture.listeners.length} участникам</small>}
				</Space>
			),
		},
		{
			key: 'actions',
			render: (_, lecture) =>
				!screens.md ? (
					<Dropdown menu={{ items: mobileMenu }} trigger={['click']}>
						<TbDotsVertical size={16} style={{ position: 'relative', top: 2 }} />
					</Dropdown>
				) : lecture.requestedById === session?.user?.id &&
				  (lecture.stage === LectureStage.Requested || lecture.stage === LectureStage.Proposed) ? (
					<Space wrap={screens.md ? false : true}>
						<Button onClick={() => handleEditLectureRequest(lecture.id)}>Изменить</Button>
						<Popconfirm
							title="Точно хотите удалить？"
							okText="Да"
							cancelText="Нет"
							onConfirm={() => handleDeleteLectureRequest(lecture.id)}
						>
							<Button type="text" danger>
								<HiOutlineTrash />
							</Button>
						</Popconfirm>
					</Space>
				) : null,
		},
	]

	const handleSetLecturer = async (lectureId: string) => {
		setSelectedLectureId(lectureId)
		setShowSetLecturerModal(true)
	}

	const handleEditLectureRequest = (lectureId: string) => {
		setSelectedLectureId(lectureId)
		setShowLectureRequestModal(true)
	}

	const handleDeleteLectureRequest = async (lectureId: string) => {
		try {
			await deleteLecture({ id: lectureId })

			message.success('Запрос на лецию был удален')
		} catch (error: any) {
			message.error('Error')
		}
	}

	const handleDeleteLecturerRequest = async (lectureId: string, currentLecturerRequestId: string) => {
		try {
			await deleteLecturerRequest({ id: currentLecturerRequestId, lectureId })

			message.success('Запрос на лецию был удален')
		} catch (error: any) {
			message.error('Error')
		}
	}

	const handleSetRelevantForMe = async (lectureId: string, isRelevant: boolean) => {
		try {
			if (isRelevant) {
				await createListener({ lectureId })
			} else {
				await deleteListener({ lectureId })
			}

			await updateList()
			if (isRelevant) {
				message.success('Ваш голос учтен')
			} else {
				message.success('Вы отменили свой голос')
			}
		} catch (error: any) {
			message.error('Error')
		}
	}

	const handleSaveLectureRequest = async () => {
		setShowLectureRequestModal(false)
		setSelectedLectureId(undefined)
		await updateList()
	}

	const handleSaveSetLecturer = async () => {
		setShowSetLecturerModal(false)
		setSelectedLectureId(undefined)
		await updateList()
		onChange()
	}

	return (
		<>
			<Space wrap>
				<Button type="primary" onClick={() => setShowLectureRequestModal(true)}>
					Запросить новую лекцию
				</Button>
				{/* <Button onClick={() => setShowPropositionLectureModal(true)}>Предложить провести лекцию</Button>*/}
			</Space>

			{requestedLectures?.data?.length ? (
				<>
					<div style={{ marginTop: 32 }}>
						<Title level={4}>Запросы на лекции</Title>
						Отметьте лекции, которые вам было бы интересно посетить.
						<Spin spinning={isLoading}>
							<Table
								style={{ border: '1px solid #aaa', borderRadius: '16px', padding: '8px', marginTop: 16 }}
								columns={columns}
								dataSource={requestedLectures.data.map((l: any) => ({ ...l, key: l.id }))}
								pagination={false}
							/>
						</Spin>
					</div>

					<SetLecturerModal
						lectureId={selectedLectureId}
						open={showSetLecturerModal}
						onOk={handleSaveSetLecturer}
						onCancel={() => {
							setShowSetLecturerModal(false)
							setSelectedLectureId(undefined)
						}}
					/>

					<LectureDetailsModal
						lectureId={selectedLectureId}
						open={showLectureDetails}
						onOk={() => {
							setShowLectureDetails(false)
							setSelectedLectureId(undefined)
						}}
						onCancel={() => {
							setShowLectureDetails(false)
							setSelectedLectureId(undefined)
						}}
					/>
				</>
			) : null}

			<LectureRequestModal
				lectureId={selectedLectureId}
				open={showLectureRequestModal}
				onOk={handleSaveLectureRequest}
				onCancel={() => {
					setShowLectureRequestModal(false)
					setSelectedLectureId(undefined)
				}}
			/>

			<PropositionLectureModal
				lectureId={selectedLectureId}
				open={showPropositionLectureModal}
				onOk={() => setShowPropositionLectureModal(false)}
				onCancel={() => setShowPropositionLectureModal(false)}
			/>
		</>
	)
}
