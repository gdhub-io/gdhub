import { useState } from 'react'
import { Button, Dropdown, Grid, Menu, Popconfirm, Space, Spin, Table, Tooltip, message } from 'antd'
import { ItemType } from 'antd/lib/menu/hooks/useItems'
import { ColumnsType } from 'antd/lib/table'
import { useSession } from 'next-auth/react'
import { FaChalkboardTeacher } from 'react-icons/fa'
import { HiOutlineTrash } from 'react-icons/hi'
import { TbHeartOff, TbHeart, TbDotsVertical } from 'react-icons/tb'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import LectureDetailsModal from '@/components/modals/LectureDetailsModal'
import LectureRequestModal from '@/components/modals/LectureRequestModal'
import PropositionLectureModal from '@/components/modals/PropositionLectureModal'
import SetLecturerModal from '@/components/modals/SetLecturerModal'
import { fetcher, fetherForMutation } from '@/helpers/fetcher'
import { lectureStatusAsText } from '@/helpers/format'

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
	const {
		data,
		mutate: updateList,
		isValidating: isLoading,
	} = useSWR({ url: '/api/lecture/list', data: { status: ['Requested'] } }, fetcher, {
		revalidateOnFocus: false,
	})
	const { trigger: updateReleventForListener } = useSWRMutation('/api/lecture/listener', fetherForMutation)
	const { trigger: deleteLecture } = useSWRMutation('/api/lecture/delete', fetherForMutation)

	const columns: ColumnsType<DataType> = [
		{
			title: 'Тема лекции',
			dataIndex: 'Name',
			key: 'Name',
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
						<small>{lectureStatusAsText(lecture.Status)}</small>
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
						<small>{lecture.Direction}</small>
					</div>
				),
		},
		{
			title: 'Направление',
			dataIndex: 'Direction',
			key: 'Direction',
			responsive: ['md'],
		},
		{
			title: screens.lg ? 'Лектор' : null,
			dataIndex: 'Lecturer Name',
			responsive: ['md'],
			key: 'Lecturer Name',
			render: (data: any, lecture) => {
				const applicatnsCount = lecture['Applicants Count'] as number

				if (data) {
					return data
				} else {
					return applicatnsCount >= 10 ? (
						<Button type="primary" onClick={() => handleSetLecturer(lecture.id)}>
							<Space align="center">
								<FaChalkboardTeacher style={{ position: 'relative', top: '2px' }} /> Стать лектором
							</Space>
						</Button>
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
					{(lecture['Applicants Count'] as number) >= 3 && (
						<small>актульно {lecture['Applicants Count']} участникам</small>
					)}
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
				) : lecture['Requested By'][0] === session?.user?.id &&
				  (lecture.Status === 'Requested' || lecture.Status === 'Proposed') ? (
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
			const { error } = await updateList()

			if (error) throw new Error(error)

			message.success('Запрос на лецию был удален')
		} catch (error: any) {
			message.error('Error')
		}
	}

	const handleSetRelevantForMe = async (lectureId: string, isRelevant: boolean) => {
		try {
			const data = await updateReleventForListener({ lectureId, isRelevant })

			if (!data || data.error) throw new Error(data.error)

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
				<Button onClick={() => setShowPropositionLectureModal(true)}>Предложить провести лекцию</Button>
			</Space>

			{data?.data?.length ? (
				<>
					<div>
						<h3>Запросы на лекции</h3>
						Отметьте лекции, которые вам было бы интересно посетить.
						<Spin spinning={isLoading}>
							<Table
								style={{ border: '1px solid #aaa', borderRadius: '16px', padding: '8px', marginTop: 16 }}
								columns={columns}
								dataSource={data.data.map((l: any) => ({ ...l, key: l.id }))}
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
