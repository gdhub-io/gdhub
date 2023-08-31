import { useMemo, useState } from 'react'
import LectureDetailsModal from '@/components/modals/LectureDetailsModal'
import { Lecture, LectureListener, LectureStage, User, WorkDirection } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Button, Grid, Spin, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'

export const ReadyLectures = () => {
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const [selectedLectureId, setSelectedLectureId] = useState<string>()
	const [showLectureDetails, setShowLectureDetails] = useState(false)
	const { data: readyLectures, isLoading: isLoadingReadyLectures } = useQuery(['lectures', 'ready'], () =>
		axios.get<
			(Lecture & {
				listeners: LectureListener[]
				direction: WorkDirection
				lecturer: User
				isRelevant: boolean
				isAuthor: boolean
			})[]
		>('/api/lectures', {
			params: { stage: [LectureStage.Ready, LectureStage.Proposed].join(',') },
		})
	)

	const columns: ColumnsType<
		Lecture & {
			listeners: LectureListener[]
			direction: WorkDirection
			lecturer: User
			isRelevant: boolean
			isAuthor: boolean
		}
	> = useMemo(
		() => [
			{
				title: 'Тема лекции',
				dataIndex: 'name',
				key: 'name',
				render: (text, lecture) => {
					const _date = dayjs(lecture.date).format('dd LLL yyyy, T')

					return screens.md ? (
						<div
							style={{ cursor: 'pointer' }}
							onClick={() => {
								setSelectedLectureId(lecture.id)
								setShowLectureDetails(true)
							}}
						>
							<strong>{text}</strong>
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
							<small>{lecture.directionId}</small>
							<br />
							<small>Дата: {_date}</small>
							<Button
								style={{ marginTop: '10px' }}
								onClick={() => {
									setSelectedLectureId(lecture.id)
									setShowLectureDetails(true)
								}}
							>
								Вход/Регистрация
							</Button>
						</div>
					)
				},
			},
			{
				title: 'Направление',
				dataIndex: 'directionId',
				key: 'directionId',
				responsive: ['md'],
			},
			{
				title: 'Лектор',
				dataIndex: 'lecturerId',
				key: 'Lecturer Name',
				responsive: ['md'],
			},
			{
				title: 'Дата',
				dataIndex: 'date',
				key: 'date',
				responsive: ['md'],
				render: (date) => {
					return DateTime.fromISO(date).toFormat('dd LLL yyyy, t', {
						locale: router.locale,
					})
				},
			},
			{
				key: 'register-to-lecture',
				responsive: ['md'],
				render: (_, lecture) => (
					<Button
						onClick={() => {
							setSelectedLectureId(lecture.id)
							setShowLectureDetails(true)
						}}
					>
						Вход/Регистрация
					</Button>
				),
			},
		],
		[screens]
	)

	return (
		<>
			{readyLectures && readyLectures.data?.length > 0 ? (
				<>
					<div>
						<h3>Запланированные лекции</h3>
						<Spin spinning={isLoadingReadyLectures}>
							<Table
								style={{ border: '1px solid #aaa', borderRadius: '16px', padding: '8px', background: '#c1e994' }}
								columns={columns}
								dataSource={readyLectures.data.map((l) => ({ ...l, key: l.id }))}
								pagination={false}
							/>
						</Spin>
					</div>

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
		</>
	)
}
