import { useState } from 'react'
import { CreateWorkflowModal } from '@/components/admin/CreateWorkflowModal'
import ModernTable from '@/components/ModernTable'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoTrash } from '@react-icons/all-files/go/GoTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Popconfirm, Popover, Row, Space, Typography, Tabs } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Title, Text } = Typography

const WorkflowsAdminPage: NextPageWithLayout = () => {
	const router = useRouter()
	const [showModal, setShowModal] = useState(false)
	const [workflowId, setWorkflowId] = useState<string | undefined>(undefined)

	// Workflow schemas (templates)
	const {
		data: workflowsResponse,
		refetch: refetchWorkflows,
		isFetching: isFetchingWorkflows,
	} = useQuery(['admin', 'workflows'], () => axios.get('/api/admin/workflows'), {
		refetchOnWindowFocus: false,
	})

	// Project workflows
	const {
		data: projectWorkflowsResponse,
		refetch: refetchProjectWorkflows,
		isFetching: isFetchingProjectWorkflows,
	} = useQuery(['admin', 'project-workflows'], () => axios.get('/api/admin/project-workflows'), {
		refetchOnWindowFocus: false,
	})

	const { mutateAsync: deleteWorkflow } = useMutation(
		({ id }: { id: string }) => axios.delete(`/api/admin/workflow/${id}`),
		{
			onSuccess: () => {
				refetchWorkflows()
			},
		}
	)

	const handleDelete = (recordId: string) => {
		deleteWorkflow({ id: recordId })
		setWorkflowId(undefined)
	}

	const handleCreateWorkflow = (id: string) => {
		setWorkflowId(id)
		setShowModal(false)
		router.push(`/admin/workflow/${id}`)
	}

	// Columns for workflow schemas (templates)
	const workflowColumns: ColumnsType<prismaClient.WorkflowSchema> = [
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

	// Columns for project workflows
	const projectWorkflowColumns: ColumnsType<any> = [
		{
			title: 'Project',
			dataIndex: ['project', 'name'],
			key: 'projectName',
			width: '20%',
			render: (value, record) => (
				<div>
					<Link href={`/admin/project-workflow/${record.id}`}>
						<strong>{value}</strong>
					</Link>
					<div>
						<Text type="secondary" style={{ fontSize: '12px' }}>
							by {record.project?.author?.name}
						</Text>
					</div>
				</div>
			),
		},
		{
			title: 'Current Stage',
			key: 'currentStage',
			width: '15%',
			render: (_, record) => (
				<div>
					<div style={{ fontWeight: 'bold', color: '#1890ff' }}>{record.analytics?.currentStepName || 'Не начат'}</div>
					<Text type="secondary" style={{ fontSize: '12px' }}>
						Этап {(record.analytics?.currentStepOrder || 0) + 1} из {record.analytics?.totalSteps || 0}
					</Text>
				</div>
			),
		},
		{
			title: 'Tasks Progress',
			key: 'tasksProgress',
			width: '15%',
			render: (_, record) => {
				const percentage = record.analytics?.completionPercentage || 0
				const completed = record.analytics?.completedTasks || 0
				const total = record.analytics?.totalTasks || 0

				return (
					<div style={{ textAlign: 'center' }}>
						<div
							style={{
								fontSize: '16px',
								fontWeight: 'bold',
								color: percentage >= 80 ? '#52c41a' : percentage >= 50 ? '#faad14' : '#ff4d4f',
							}}
						>
							{completed}/{total}
						</div>
						<Text type="secondary" style={{ fontSize: '12px' }}>
							{percentage}% выполнено
						</Text>
					</div>
				)
			},
		},
		{
			title: 'Time Active',
			key: 'timeActive',
			width: '12%',
			render: (_, record) => {
				const days = record.analytics?.daysInProgress || 0
				return (
					<div style={{ textAlign: 'center' }}>
						<div style={{ fontSize: '18px', fontWeight: 'bold', color: '#722ed1' }}>{days}</div>
						<Text type="secondary" style={{ fontSize: '11px' }}>
							{days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
						</Text>
					</div>
				)
			},
		},
		{
			title: 'Workflow',
			dataIndex: 'title',
			key: 'workflowTitle',
			width: '15%',
			render: (value) => <div style={{ fontSize: '13px' }}>{value || <Text type="secondary">No title</Text>}</div>,
		},
		{
			title: 'Created',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: '12%',
			render: (value) => (
				<Popover content={dayjs(value).format('LLLL')}>
					<div style={{ fontSize: '12px' }}>{dayjs(value).format('DD/MM/YY')}</div>
				</Popover>
			),
		},
		{
			title: 'Actions',
			key: 'actions',
			width: '8%',
			render: (_, record) => (
				<Link href={`/admin/project-workflow/${record.id}`}>
					<Button type="primary" size="small">
						Edit
					</Button>
				</Link>
			),
		},
	]

	const tabItems = [
		{
			key: 'templates',
			label: 'Шаблоны воркфлоу',
			children: (
				<div>
					<Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
						<Title level={3}>Шаблоны воркфлоу</Title>
						<Button onClick={() => setShowModal(true)} type="primary">
							Добавить шаблон
						</Button>
					</Row>
					<ModernTable loading={isFetchingWorkflows} dataSource={workflowsResponse?.data} columns={workflowColumns} />
				</div>
			),
		},
		{
			key: 'projects',
			label: 'Проектные воркфлоу',
			children: (
				<div>
					<Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
						<Title level={3}>Проектные воркфлоу</Title>
					</Row>
					<ModernTable
						loading={isFetchingProjectWorkflows}
						dataSource={projectWorkflowsResponse?.data}
						columns={projectWorkflowColumns}
					/>
				</div>
			),
		},
	]

	return (
		<>
			<div className={styles.main}>
				<Title level={2}>Workflows</Title>
				<Tabs defaultActiveKey="templates" items={tabItems} />
			</div>

			<CreateWorkflowModal open={showModal} onCancel={() => setShowModal(false)} onOk={handleCreateWorkflow} />
		</>
	)
}

WorkflowsAdminPage.getLayout = (page) => (
	<ProtectedLayout access={[prismaClient.UserRole.Admin]}>{page}</ProtectedLayout>
)

export default WorkflowsAdminPage
