import { useMemo, useState } from 'react'
import LectureDetailsModal, { LectureDetails } from '@/components/modals/LectureDetailsModal'
import { LectureStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Grid, Spin, Table } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'

export const HeldLectures = () => {
	const screens = Grid.useBreakpoint()
	const [selectedLectureId, setSelectedLectureId] = useState<string>()
	const [showLectureDetails, setShowLectureDetails] = useState(false)
	const { t } = useTolgee()

	const {
		data: lectures,
		refetch: updateList,
		isLoading,
	} = useQuery(['lectures'], () => axios.get('/api/lectures', { params: { stage: LectureStage.Held } }))

	const columns: ColumnsType<LectureDetails> = useMemo(
		() => [
			{
				title: t('lecture.topic', 'Lecture Topic'),
				dataIndex: 'name',
				key: 'name',
				render: (text, lecture) => {
					const _date = dayjs(lecture.date).format('ll')

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
							<small>
								<T>Date</T>: {_date}
							</small>
						</div>
					)
				},
			},
			{
				title: t('lecturer', 'Lecturer'),
				dataIndex: 'lecturerId',
				key: 'lecturerId',
				responsive: ['md'],
				render(data, record) {
					const speaker = record.lecturerRequests?.find((l) => l.isSpeaker)

					return speaker?.user.name
				},
			},
			{
				title: t('date', 'Date'),
				dataIndex: 'date',
				key: 'date',
				responsive: ['md'],
				render: (date) => {
					return dayjs(date).format('ll')
				},
			},
		],
		[screens]
	)

	return (
		<>
			{lectures?.data?.length > 0 ? (
				<div>
					<h3>
						<T>Past Lectures</T>
					</h3>
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
