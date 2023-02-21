import { useMemo, useState } from 'react'
import LectureDetailsModal from '@components/modals/LectureDetailsModal'
import { fetcher } from '@helpers/fetcher'
import { Button, Grid, Spin, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import useSWR from 'swr'

export const ReadyLectures = () => {
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const [selectedLectureId, setSelectedLectureId] = useState<string>()
	const [showLectureDetails, setShowLectureDetails] = useState(false)
	const {
		data,
		mutate: updateList,
		isValidating: isLoadingReadyLectures,
	} = useSWR({ url: '/api/lecture/list', data: { status: ['Ready'] } }, fetcher, { revalidateOnFocus: false })

	const columns: ColumnsType<DataType> = useMemo(
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
							<Button
								style={{ marginTop: '10px' }}
								onClick={() => {
									setSelectedLectureId(lecture.id)
									setShowLectureDetails(true)
								}}
							>
								Регистрация
							</Button>
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
						Регистрация
					</Button>
				),
			},
		],
		[screens]
	)

	return (
		<>
			{data?.data?.length > 0 ? (
				<div>
					<h3>Запланированные лекции</h3>
					<Spin spinning={isLoadingReadyLectures}>
						<Table
							style={{ border: '1px solid #aaa', borderRadius: '16px', padding: '8px', background: '#c1e994' }}
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
