import { useEffect, useState } from 'react'
import SeasonStageModal from '@/components/modals/SeasonStageModal'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Button, Popconfirm, Row, Space, Switch, Table, Typography, message } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GoArrowLeft, GoTrash } from 'react-icons/go'
import { useMutation, useQuery } from 'react-query'
import styles from './style.module.scss'

const { Title, Text } = Typography

const SeasonStagesAdminPage: NextPageWithLayout = () => {
	const router = useRouter()
	const [showModal, setShowModal] = useState(false)
	const [stageId, setStageId] = useState<string | undefined>(undefined)

	const {
		data: response,
		error,
		refetch,
	} = useQuery(['admin', 'seasons'], () =>
		axios.get(`/api/admin/season/stages`, { params: { seasonId: router.query.id } })
	)

	const { mutate: updateStage, isLoading: isUpdatig } = useMutation(
		({ id, isCurrent }: any) => axios.put(`/api/admin/season/stage`, { isCurrent }, { params: { id } }),
		{
			onError() {
				message.error('Something wrong. Try later again.')
			},
			onSuccess(data) {
				message.success('Current stage was changed')
				refetch()
			},
		}
	)

	const { mutateAsync: deleteStage } = useMutation(
		({ id }: { id: string }) => axios.delete(`/api/admin/season/stage`, { params: { id } }),
		{
			onSuccess: () => {
				refetch()
			},
		}
	)

	useEffect(() => {
		console.log(router, error, response)
	}, [error, response])

	const handleSave = () => {
		setShowModal(false)
		setStageId(undefined)
		refetch()
	}

	const handleClose = (stageId: string) => {
		setStageId(undefined)
		setShowModal(false)
	}

	const handleEdit = (stageId: string) => {
		setStageId(stageId)
		setShowModal(true)
	}

	const handleDelete = async (stageId: string) => {
		await deleteStage({ id: stageId })
		setStageId(undefined)
	}

	const handleSetCurrent = (stageId: string, isCurrent: boolean) => {
		updateStage({ id: stageId, isCurrent })
	}

	const columns: ColumnsType<any> = [
		{
			title: '#',
			dataIndex: 'order',
			width: '40px',
			key: 'order',
			render: (value) => <Text type="secondary">{value}</Text>,
		},
		{ title: 'Title', dataIndex: 'name', key: 'name', render: (value) => <Text strong>{value}</Text> },
		{
			title: 'Period (UTC' + dayjs().format('Z') + ')',
			dataIndex: 'startedAt',
			key: 'startedAt',
			render: (value, data) =>
				!!data.startedAt ? (
					<Text>
						From {dayjs(data.startedAt).format('LLL')} to{' '}
						{data.finishedAt ? dayjs(data.finishedAt).format('LLL') : 'unknown'}
					</Text>
				) : (
					<Text type="secondary">No data. You should set date period.</Text>
				),
		},
		{
			title: 'Is Current',
			dataIndex: 'isCurrent',
			key: 'isCurrent',
			width: '120px',
			align: 'center',
			render(value, record) {
				return (
					<Switch
						disabled={!record.startedAt}
						loading={isUpdatig}
						checked={value}
						onChange={(newValue) => handleSetCurrent(record.id, newValue)}
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
						<Title level={2}>Season Stages</Title>
						<Text type="secondary">seasonId: {router.query.id}</Text>
					</Space>
					<Button onClick={() => setShowModal(true)} type="primary">
						Add stage
					</Button>
				</Row>

				<Table id="stages" dataSource={response?.data} columns={columns} sticky />
			</div>

			<SeasonStageModal
				seasonId={router.query.id}
				stageId={stageId}
				open={showModal}
				onCancel={handleClose}
				onOk={handleSave}
			/>
		</>
	)
}

SeasonStagesAdminPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonStagesAdminPage
