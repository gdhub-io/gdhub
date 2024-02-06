import { useMemo, useState } from 'react'
import LectureDetailsModal, { LectureDetails } from '@/components/modals/LectureDetailsModal'
import { LectureStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Grid, Spin, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'

export const HeldLectures = () => {
	const screens = Grid.useBreakpoint()
	const [selectedLectureId, setSelectedLectureId] = useState<string>()
	const [showLectureDetails, setShowLectureDetails] = useState(false)

	const {
		data: lectures,
		refetch: updateList,
		isLoading,
	} = useQuery(['lectures'], () => axios.get('/api/lectures', { params: { stage: LectureStage.Held } }))

	const columns: ColumnsType<LectureDetails> = useMemo(
		() => [
			{
				title: 'Тема лекции',
				dataIndex: 'name',
				key: 'name',
				render: (text, lecture) => {
					const _date = dayjs(lecture.date).format('dd LLL YYYY')

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
						</div>
					)
				},
			},
			{
				title: 'Лектор',
				dataIndex: 'lecturerId',
				key: 'lecturerId',
				responsive: ['md'],
				render(data, record) {
					const speaker = record.lecturerRequests?.find((l) => l.isSpeaker)

					return speaker?.user.name
				},
			},
			{
				title: 'Дата',
				dataIndex: 'date',
				key: 'date',
				responsive: ['md'],
				render: (date) => {
					return dayjs(date).format('dd LLL YYYY')
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
