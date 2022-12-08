import { useEffect, useMemo, useState } from 'react'
import LectureDetailsModal from '@components/modals/LectureDetailsModal'
import LectureRequestModal from '@components/modals/LectureRequestModal'
import PropositionLectureModal from '@components/modals/PropositionLectureModal'
import SetLecturerModal from '@components/modals/SetLecturerModal'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { Button, Dropdown, Grid, Menu, message, Popconfirm, Space, Spin, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ItemType } from 'antd/lib/menu/hooks/useItems'
import { DateTime } from 'luxon'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { FaChalkboardTeacher } from 'react-icons/fa'
import { HiOutlineTrash } from 'react-icons/hi'
import { TbHeart, TbHeartOff, TbDotsVertical } from 'react-icons/tb'
import useSWR from 'swr'

type LectureStatus = 'Requested' | 'Relevantized' | 'Canceled' | 'Ready' | 'Held'

type LectureDirection =
	| 'Programming'
	| 'Game Design'
	| '2D Art & Animation'
	| '3D Art & Animation'
	| 'Project Management'
	| 'Product Management'
	| 'Technical Artist'
	| 'Team Management'

interface DataType {
	key: string
	Name: string
	Status: LectureStatus
	Direction: LectureDirection
	Wishes: string
	[key: string]: any
}

const fetcher = (url: string, data: any) =>
	fetch(url, { method: 'post', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(
		(res) => res.json()
	)

const LecturesPage: NextPageWithLayout = () => {
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()
	const [loading, setLoading] = useState(true)
	const [showLectureRequestModal, setShowLectureRequestModal] = useState(false)
	const [showSetLecturerModal, setShowSetLecturerModal] = useState(false)
	const [showLectureDetails, setShowLectureDetails] = useState(false)
	const [showPropositionLectureModal, setShowPropositionLectureModal] = useState(false)
	const [selectedLectureId, setSelectedLectureId] = useState<string>()

	const {
		data: requestedLectures,
		mutate: mutateRequestedLectures,
		isValidating: isLoadingRequestedLectures,
	} = useSWR(['/api/lecture/list', { status: ['Requested', 'Actualized'] }], fetcher, { revalidateOnFocus: false })

	const {
		data: readyLectures,
		mutate: mutateReadyLectures,
		isValidating: isLoadingReadyLectures,
	} = useSWR(['/api/lecture/list', { status: ['Ready'] }], fetcher, { revalidateOnFocus: false })

	useEffect(() => {
		setLoading(false)
	}, [])

	const mobileMenuForRequested: ItemType[] = [
		{
			label: 'Изменить',
			key: 'edit',
		},
		{
			label: 'Удалить',
			key: 'delete',
		},
	]

	const columnsForRequested: ColumnsType<DataType> = [
		{
			title: 'Тема лекции',
			dataIndex: 'Name',
			key: 'Name',
			width: screens.lg ? 'auto' : '100%',
			render: (text, lecture) =>
				screens.md ? (
					<strong>{text}</strong>
				) : (
					<>
						<strong>{text}</strong>
						<br />
						<small>{lecture.Direction}</small>
					</>
				),
		},
		{
			title: 'Направление',
			dataIndex: 'Direction',
			key: 'Direction',
			responsive: ['md'],
		},
		{
			title: screens.lg ? 'Хочешь провести лекцию?' : null,
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
						<small>Ждем больше желающих</small>
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
					<Dropdown overlay={<Menu items={mobileMenuForRequested} />} trigger={['click']}>
						<TbDotsVertical size={16} style={{ position: 'relative', top: 2 }} />
					</Dropdown>
				) : lecture['Requested By'][0] === session?.user?.id && lecture.Status === 'Requested' ? (
					<Space wrap>
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

	const columnsForReady: ColumnsType<DataType> = useMemo(
		() => [
			{
				title: 'Тема лекции',
				dataIndex: 'Name',
				key: 'Name',
				render: (text, lecture) => {
					const _date = DateTime.fromISO(lecture.Date).toFormat('dd LLL yyyy, T', {
						locale: router.locale,
					})

					return screens.md ? (
						<strong>{text}</strong>
					) : (
						<>
							<strong>{text}</strong>
							<br />
							<small>{lecture.Direction}</small>
							<br />
							<small>Дата: {_date}</small>
						</>
					)
				},
			},
			{
				title: 'Направление',
				dataIndex: 'Direction',
				key: 'Direction',
				responsive: ['md'],
			},
			{
				title: 'Лектор',
				dataIndex: 'Lecturer Name',
				key: 'Lecturer Name',
				responsive: ['md'],
			},
			{
				title: 'Дата',
				dataIndex: 'Date',
				key: 'Date',
				responsive: ['md'],
				render: (date) => {
					return DateTime.fromISO(date).toFormat('dd LLL yyyy, t', {
						locale: router.locale,
					})
				},
			},
			{
				key: 'register-to-lecture',
				render: (_, lecture) => (
					<Button
						onClick={() => {
							setSelectedLectureId(lecture.id)
							setShowLectureDetails(true)
						}}
					>
						Подробнее
					</Button>
				),
			},
		],
		[screens]
	)

	const handleSaveLectureRequest = async () => {
		setShowLectureRequestModal(false)
		setSelectedLectureId(undefined)
		await mutateRequestedLectures()
	}

	const handleEditLectureRequest = (lectureId: string) => {
		setSelectedLectureId(lectureId)
		setShowLectureRequestModal(true)
	}

	const handleDeleteLectureRequest = async (lectureId: string) => {
		try {
			const response = await fetch('/api/lecture/delete', {
				method: 'post',
				body: JSON.stringify({ id: lectureId }),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			if (!response.ok) throw new Error()

			await mutateRequestedLectures()
			message.success('Запрос на лецию был удален')
		} catch (error: any) {
			message.error('Error')
		}
	}

	const handleSetRelevantForMe = async (lectureId: string, isRelevant: boolean) => {
		try {
			const response = await fetch('/api/lecture/listener', {
				method: 'post',
				body: JSON.stringify({ lectureId, isRelevant }),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			if (!response.ok) throw new Error()

			const data = await response.json()

			if (data.error) throw new Error(data.error)

			await mutateRequestedLectures()
			if (isRelevant) {
				message.success('Ваш голос учтен')
			} else {
				message.success('Вы отменили свой голос')
			}
		} catch (error: any) {
			message.error('Error')
		}
	}

	const handleSetLecturer = async (lectureId: string) => {
		setSelectedLectureId(lectureId)
		setShowSetLecturerModal(true)
	}

	const handleSaveSetLecturer = async () => {
		setShowSetLecturerModal(false)
		setSelectedLectureId(undefined)
		await mutateRequestedLectures()
		await mutateReadyLectures()
	}

	return (
		<>
			<Head>
				<title>Лекции</title>
			</Head>
			<h1>Лекции (бета)</h1>
			<Space direction="vertical" size="large">
				<p>
					Часто при решении тех или иных задач возникает множество вопросов. Этот раздел поможет найти на них ответы у
					других участников геймхаба. Создайте запрос на интересующую вас тему и, если она будет актуальна не только для
					вас, попробуем ее провести.
					<br />А тем, кто хочет делиться своим опытом с другими, здесь вы найдете возможность это делать. Следите за
					темами, которые интересуют других участников и предлагайте себя в качестве лектора.
					<br />
					Делимся знаниями, набираемся мудрости ;)
				</p>

				<Space wrap>
					<Button type="primary" onClick={() => setShowLectureRequestModal(true)}>
						Запросить новую лекцию
					</Button>
					<Button onClick={() => setShowPropositionLectureModal(true)}>Предложить провести лекцию</Button>
				</Space>

				{requestedLectures?.data?.length > 0 && (
					<div>
						<h3>Запросы на лекции</h3>
						Отметьте лекции, которые вам было бы интересно посетить.
						<Spin spinning={isLoadingRequestedLectures}>
							<Table
								style={{ border: '1px solid #aaa', borderRadius: '16px', padding: '8px', marginTop: 16 }}
								columns={columnsForRequested}
								dataSource={requestedLectures?.data.map((l: any) => ({ ...l, key: l.id }))}
								pagination={false}
							/>
						</Spin>
					</div>
				)}

				{readyLectures?.data?.length > 0 && (
					<div>
						<h3>Запланированные лекции</h3>
						<Spin spinning={isLoadingReadyLectures}>
							<Table
								style={{ border: '1px solid #aaa', borderRadius: '16px', padding: '8px' }}
								columns={columnsForReady}
								dataSource={readyLectures?.data.map((l: any) => ({ ...l, key: l.id }))}
								pagination={false}
							/>
						</Spin>
					</div>
				)}
			</Space>

			<LectureRequestModal
				lectureId={selectedLectureId}
				open={showLectureRequestModal}
				onOk={handleSaveLectureRequest}
				onCancel={() => {
					setShowLectureRequestModal(false)
					setSelectedLectureId(undefined)
				}}
			/>
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
			<PropositionLectureModal
				open={showPropositionLectureModal}
				onOk={() => setShowPropositionLectureModal(false)}
				onCancel={() => setShowPropositionLectureModal(false)}
			/>
		</>
	)
}

LecturesPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default LecturesPage
