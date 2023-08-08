import { useState } from 'react'
import SeasonStreamReportModal from '@/components/modals/SeasonStreamReportModal'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { SeasonStreamReport } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Popconfirm, Row, Space, Table, Typography, message } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GoArrowLeft, GoTrash } from 'react-icons/go'
import styles from './style.module.scss'

const { Title, Text } = Typography

const SeasonStreamReportsPage: NextPageWithLayout = () => {
	const router = useRouter()
	const [showModal, setShowModal] = useState(false)
	const [streamReportId, setStreamReportId] = useState<string | undefined>(undefined)

	const {
		data: streamReports,
		error,
		refetch,
	} = useQuery(
		['admin', 'season-stream-reports'],
		() =>
			axios.get<SeasonStreamReport[]>(`/api/admin/season/stream-reports`, { params: { seasonId: router.query.id } }),
		{ enabled: !!router.query.id }
	)

	const { mutate: updateStreamReport, isLoading: isUpdatig } = useMutation(
		({ id, isCurrent }: any) => axios.put(`/api/admin/season/stream-report`, { isCurrent }, { params: { id } }),
		{
			onError() {
				message.error('Something wrong. Try later again.')
			},
			onSuccess(data) {
				message.success('Current streamReport was changed')
				refetch()
			},
		}
	)

	const { mutateAsync: deleteStreamReport } = useMutation(
		({ id }: { id: string }) => axios.delete(`/api/admin/season/stream-report`, { params: { id } }),
		{
			onSuccess: () => {
				refetch()
			},
		}
	)

	const handleSave = () => {
		setShowModal(false)
		setStreamReportId(undefined)
		refetch()
	}

	const handleClose = (streamReportId: string) => {
		setStreamReportId(undefined)
		setShowModal(false)
	}

	const handleEdit = (streamReportId: string) => {
		setStreamReportId(streamReportId)
		setShowModal(true)
	}

	const handleDelete = async (streamReportId: string) => {
		await deleteStreamReport({ id: streamReportId })
	}

	const columns: ColumnsType<any> = [
		{
			title: 'Date',
			dataIndex: 'date',
			// width: '40px',
			key: 'date',
			render(value) {
				return dayjs(value).format('LLL')
			},
		},
		{
			title: 'Stage',
			dataIndex: 'stageId',
			// width: '100%',
			key: 'stageId',
			render(value, record) {
				return record.stage.name
			},
		},
		{
			key: 'actions',
			width: '120px',
			render(value, record) {
				return (
					<Space size="large">
						<Button onClick={() => handleEdit(record.id)}>Edit</Button>
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
					<Space align="center">
						<Link href="/admin/seasons">
							<Button icon={<GoArrowLeft />} type="text" style={{ marginBottom: '0.5em' }} />
						</Link>
						<Title level={2}>Stream Reports</Title>
						<Text type="secondary">seasonId: {router.query.id}</Text>
					</Space>
					<Button onClick={() => setShowModal(true)} type="primary">
						Add date
					</Button>
				</Row>

				<Table id="reports" dataSource={streamReports?.data} columns={columns} />
			</div>

			<SeasonStreamReportModal
				seasonId={router.query.id}
				streamReportId={streamReportId}
				open={showModal}
				onCancel={handleClose}
				onOk={handleSave}
			/>
		</>
	)
}

SeasonStreamReportsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonStreamReportsPage
