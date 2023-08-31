import { useMemo, useState } from 'react'
import LectureDetailsModal from '@/components/modals/LectureDetailsModal'
import { Lecture, LectureListener, LectureStage, User, WorkDirection } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Grid, Spin, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'

export const HeldLectures = () => {
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const [selectedLectureId, setSelectedLectureId] = useState<string>()
	const [showLectureDetails, setShowLectureDetails] = useState(false)
	// const {
	// 	data,
	// 	mutate: updateList,
	// 	isValidating: isLoading,
	// } = useSWR({ url: '/api/lecture/list', data: { status: ['Held'] } }, fetcher, { revalidateOnFocus: false })

	const {
		data: lectures,
		refetch: updateList,
		isLoading,
	} = useQuery(['lectures'], () => axios.get('/api/lectures', { params: { stage: LectureStage.Held } }))

	const columns: ColumnsType<DataType> = useMemo(
		() => [
			{
				title: 'Тема лекции',
				dataIndex: 'name',
				key: 'name',
				render: (text, lecture) => {
					const _date = DateTime.fromISO(lecture.Date).toFormat('dd LLL yyyy', {
						locale: router.locale,
					})

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
							<small>{lecture.Direction}</small>
							<br />
							<small>Дата: {_date}</small>
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
				key: 'lecturerId',
				responsive: ['md'],
			},
			{
				title: 'Дата',
				dataIndex: 'date',
				key: 'date',
				responsive: ['md'],
				render: (date) => {
					return DateTime.fromISO(date).toFormat('dd LLL yyyy', {
						locale: router.locale,
					})
				},
			},
		],
		[screens]
	)

	return (
		<>
			{lectures?.data?.length > 0 ? (
				<div>
					<h3>Прошедшие лекции</h3>
					<Spin spinning={isLoading}>
						<Table
							style={{ border: '1px solid #aaa', borderRadius: '16px', padding: '8px' }}
							columns={columns}
							dataSource={lectures?.data.map((l: any) => ({ ...l, key: l.id }))}
							pagination={false}
						/>
					</Spin>
				</div>
			) : null}

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
	)
}
