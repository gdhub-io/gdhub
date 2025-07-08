import { useState } from 'react'
import { CreateWorkflowModal } from '@/components/admin/CreateWorkflowModal'
import ModernTable from '@/components/ModernTable'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoTrash } from '@react-icons/all-files/go/GoTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Popconfirm, Popover, Row, Space, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Title, Text, Paragraph } = Typography

const WorkflowsAdminPage: NextPageWithLayout = () => {
	const router = useRouter()
	const [showModal, setShowModal] = useState(false)
	const [workflowId, setWorkflowId] = useState<string | undefined>(undefined)
	const {
		data: response,
		refetch: refetchWorkflows,
		isFetching,
	} = useQuery(['admin', 'workflows'], () => axios.get('/api/admin/workflows'), { refetchOnWindowFocus: false })
	const { mutateAsync: deleteWorkflow } = useMutation(
		({ id }: { id: string }) => axios.delete(`/api/admin/workflow/${id}`),
		{
			onSuccess: () => {
				refetchWorkflows()
			},
		}
	)

	// const handleChange = (recordId: string) => {
	// 	setLectureId(recordId)
	// 	setShowModal(true)
	// }

	const handleDelete = (recordId: string) => {
		deleteWorkflow({ id: recordId })
		setWorkflowId(undefined)
	}

	const handleCreateWorkflow = (id: string) => {
		setWorkflowId(id)
		setShowModal(false)

		router.push(`/admin/workflow/${id}`)
	}

	const columns: ColumnsType<prismaClient.WorkflowSchema> = [
		{
			title: 'Title',
			dataIndex: 'title',
			key: 'title',
			render: (value, record) => <Link href={`/admin/workflow/${record.id}`}>{value}</Link>,
		},
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
					<Title level={2}>Workflows</Title>
					<Button onClick={() => setShowModal(true)} type="primary">
						Add workflow
					</Button>
				</Row>
				<ModernTable loading={isFetching} dataSource={response?.data} columns={columns} />
			</div>

			<CreateWorkflowModal open={showModal} onCancel={() => setShowModal(false)} onOk={handleCreateWorkflow} />
		</>
	)
}

WorkflowsAdminPage.getLayout = (page) => (
	<ProtectedLayout access={[prismaClient.UserRole.Admin]}>{page}</ProtectedLayout>
)

export default WorkflowsAdminPage
