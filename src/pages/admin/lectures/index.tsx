import { useState } from 'react'
// import LectureModal from '@/components/modals/LectureModal'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Lecture, LectureStage, LecturerRequest, User } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Popconfirm, Popover, Row, Space, Table, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { GoTrash } from 'react-icons/go'
import styles from './style.module.scss'

const { Title, Text, Paragraph } = Typography

const LecturesAdminPage: NextPageWithLayout = () => {
	// const [showModal, setShowModal] = useState(false)
	const [lectureId, setLectureId] = useState<string | undefined>(undefined)
	const {
		data: response,
		refetch: refetchLectures,
		isFetching,
	} = useQuery(['admin', 'lectures'], () => axios.get('/api/admin/lectures'), { refetchOnWindowFocus: false })
	const { mutateAsync: deleteLecture } = useMutation(
		({ id }: { id: string }) => axios.delete(`/api/admin/lecture`, { params: { id } }),
		{
			onSuccess: () => {
				refetchLectures()
			},
		}
	)

	// const handleChange = (recordId: string) => {
	// 	setLectureId(recordId)
	// 	setShowModal(true)
	// }

	const handleDelete = (recordId: string) => {
		deleteLecture({ id: recordId })
		setLectureId(undefined)
	}

	// const handleSave = () => {
	// 	setShowModal(false)
	// 	setLectureId(undefined)
	// 	refetchLectures()
	// }

	const columns: ColumnsType<
		Lecture & {
			_count: { lecturerRequests: number; listeners: number }
			lecturerRequests: (LecturerRequest & { user: User })[]
		}
	> = [
		{
			title: 'Title',
			dataIndex: 'name',
			key: 'name',
			render: (value, record) => (
				<>
					<Paragraph strong style={{ marginBottom: 0 }}>
						{value}
					</Paragraph>
					<Space size="large">
						<Link href={`/admin/lecture/${record.id}/speakers`}>Speakers ({record._count.lecturerRequests})</Link>
						<Link href={`/admin/lecture/${record.id}/listeners`}>Listeners ({record._count.listeners})</Link>
					</Space>
				</>
			),
		},
		{
			title: 'Date',
			dataIndex: 'date',
			key: 'date',
			render: (value, data) =>
				data.stage == LectureStage.Requested ? (
					<Text type="secondary">not selected</Text>
				) : (
					dayjs(data.date).format('LLL')
				),
		},
		{
			title: 'Speaker',
			dataIndex: 'lecturerRequests',
			key: 'lecturerRequests',
			render: (value, data) =>
				!!data.lecturerRequests ? (
					data.lecturerRequests
						?.filter((lr) => lr.isSpeaker)
						.map((lr) => lr.user.name)
						.join(', ')
				) : (
					<Text type="secondary">not selected</Text>
				),
		},
		{ title: 'Stage', dataIndex: 'stage', key: 'stage' },
		{
			title: 'Created at',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (value) => (
				<Popover content={dayjs(value).format('LLL')}>
					<Text>{dayjs(value).fromNow()}</Text>
				</Popover>
			),
		},
		{
			key: 'actions',
			width: '1%',
			render(value, record) {
				return (
					<Space size="large">
						{/* <Button onClick={() => handleChange(record.id)}>Edit</Button> */}
						<Popconfirm title="Are you sure you want to delete this entry?" onConfirm={() => handleDelete(record.id)}>
							<Button danger type="text">
								<GoTrash />
							</Button>
						</Popconfirm>
					</Space>
				)
			},
		},
	]

	return (
		<>
			<div className={styles.main}>
				<Row justify="space-between" align="middle">
					<Title level={2}>Lectures</Title>
					{/* <Button onClick={() => setShowModal(true)} type="primary">
						Add lecture
					</Button> */}
				</Row>
				<Table loading={isFetching} dataSource={response?.data} columns={columns} />
			</div>

			{/* <LectureModal lectureId={lectureId} open={showModal} onCancel={() => setShowModal(false)} onOk={handleSave} /> */}
		</>
	)
}

LecturesAdminPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default LecturesAdminPage
