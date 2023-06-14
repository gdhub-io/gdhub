import { useMemo, useState } from 'react'
import { Grid, Spin, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import LectureDetailsModal from '@/components/modals/LectureDetailsModal'
import { fetcher } from '@/helpers/fetcher'

export const HeldLectures = () => {
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const [selectedLectureId, setSelectedLectureId] = useState<string>()
	const [showLectureDetails, setShowLectureDetails] = useState(false)
	const {
		data,
		mutate: updateList,
		isValidating: isLoading,
	} = useSWR({ url: '/api/lecture/list', data: { status: ['Held'] } }, fetcher, { revalidateOnFocus: false })

	const columns: ColumnsType<DataType> = useMemo(
		() => [
			{
				title: 'Тема лекции',
				dataIndex: 'Name',
				key: 'Name',
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
			{data?.data?.length > 0 ? (
				<div>
					<h3>Прошедшие лекции</h3>
					<Spin spinning={isLoading}>
						<Table
							style={{ border: '1px solid #aaa', borderRadius: '16px', padding: '8px' }}
							columns={columns}
							dataSource={data.data.map((l: any) => ({ ...l, key: l.id }))}
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
