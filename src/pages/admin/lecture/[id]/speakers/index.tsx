import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoArrowLeft } from '@react-icons/all-files/go/GoArrowLeft'
import { GoTrash } from '@react-icons/all-files/go/GoTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Popconfirm, Row, Space, Switch, Table, Typography, message } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Title, Text } = Typography

const LectureSpeakersAdminPage: NextPageWithLayout = () => {
	const router = useRouter()
	const [showModal, setShowModal] = useState(false)
	const [stageId, setStageId] = useState<string | undefined>(undefined)

	const {
		data: response,
		error,
		refetch,
	} = useQuery(
		['admin', 'seasons'],
		() =>
			axios.get<
				(prismaClient.LecturerRequest & { user: prismaClient.User & { specialities: prismaClient.Speciality[] } })[]
			>(`/api/admin/lecture/speakers`, {
				params: { lectureId: router.query.id },
			}),
		{ enabled: !!router.query.id }
	)

	const { mutateAsync: updateStage, isLoading: isUpdatig } = useMutation(
		({ id, isSpeaker }: any) => axios.put(`/api/admin/lecture/speaker`, { isSpeaker }, { params: { id } }),
		{
			onError() {
				message.error('Something wrong. Try later again.')
			},
			onSuccess(data) {
				if (!data.data.isSpeaker) {
					message.success('lecturer was canceled')
				} else {
					message.success('Lecturer was appointed')
				}

				refetch()
			},
		}
	)

	const { mutateAsync: deleteStage } = useMutation(
		({ id }: { id: string }) => axios.delete(`/api/admin/lecture/speaker`, { params: { id } }),
		{
			onSuccess: () => {
				refetch()
			},
		}
	)

	useEffect(() => {
		console.log(router, error, response)
	}, [error, response])

	// const handleSave = () => {
	// 	setShowModal(false)
	// 	setStageId(undefined)
	// 	refetch()
	// }

	// const handleClose = (stageId: string) => {
	// 	setStageId(undefined)
	// 	setShowModal(false)
	// }

	// const handleEdit = (stageId: string) => {
	// 	setStageId(stageId)
	// 	setShowModal(true)
	// }

	const handleDelete = async (stageId: string) => {
		await deleteStage({ id: stageId })
		setStageId(undefined)
	}

	const handleSetSpeaker = (stageId: string, isSpeaker: boolean) => {
		updateStage({ id: stageId, isSpeaker })
	}

	const columns: ColumnsType<
		prismaClient.LecturerRequest & { user: prismaClient.User & { specialities: prismaClient.Speciality[] } }
	> = [
		{
			title: 'Name',
			dataIndex: 'userId',
			key: 'userId',
			render: (value, data) => <Text strong>{data.user.name}</Text>,
		},
		{
			title: 'Specialities',
			dataIndex: 'specialities',
			key: 'specialities',
			render: (value, data) => data.user.specialities?.map((s) => s.name).join(', '),
		},
		{
			title: 'Created at',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (value) => dayjs(value).fromNow(),
		},
		{
			title: 'Is Speaker',
			dataIndex: 'isSpeaker',
			key: 'isSpeaker',
			width: '120px',
			align: 'center',
			render(value, record) {
				return (
					<Switch
						disabled={!record}
						loading={isUpdatig}
						checked={value}
						onChange={(newValue) => handleSetSpeaker(record.id, newValue)}
					/>
				)
			},
		},

		{
			key: 'actions',
			width: '120px',
			render(value, record) {
				return (
					<Space size="large">
						{/* <Button onClick={() => handleEdit(record.id)}>Edit</Button> */}
						<Popconfirm title="Are you sure you want to delete this entry?" onConfirm={() => handleDelete(record.id)}>
							<Button type="text" danger icon={<GoTrash />} />
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
					<Space align="center">
						<Link href="/admin/lectures">
							<Button icon={<GoArrowLeft />} type="text" style={{ marginBottom: '0.5em' }} />
						</Link>
						<Title level={2}>Lecture Speakers</Title>
						<Text type="secondary">lectureId: {router.query.id}</Text>
					</Space>
					{/* <Button onClick={() => setShowModal(true)} type="primary">
						Add stage
					</Button> */}
				</Row>

				{response?.data && <Table id="stages" dataSource={response.data} columns={columns} sticky />}
			</div>
		</>
	)
}

LectureSpeakersAdminPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default LectureSpeakersAdminPage
