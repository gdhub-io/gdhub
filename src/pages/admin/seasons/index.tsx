import { useState } from 'react'
import SeasonModal from '@/components/modals/SeasonModal'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { GoTrash } from '@react-icons/all-files/go/GoTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Popconfirm, Row, Space, Table, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import styles from './style.module.scss'

const { Title, Text, Paragraph } = Typography

const SeasonsAdminPage: NextPageWithLayout = () => {
	const [showModal, setShowModal] = useState(false)
	const [seasonId, setSeasonId] = useState<string | undefined>(undefined)
	const {
		data: response,
		refetch: refetchSeasons,
		isFetching,
	} = useQuery(['admin', 'seasons'], () => axios.get('/api/admin/seasons'), { refetchOnWindowFocus: false })
	const { mutateAsync: deleteSeason } = useMutation(
		({ id }: { id: string }) => axios.delete(`/api/admin/season`, { params: { id } }),
		{
			onSuccess: () => {
				refetchSeasons()
			},
		}
	)

	const handleChange = (recordId: string) => {
		setSeasonId(recordId)
		setShowModal(true)
	}

	const handleDelete = (recordId: string) => {
		deleteSeason({ id: recordId })
		setSeasonId(undefined)
	}

	const handleSave = () => {
		setShowModal(false)
		setSeasonId(undefined)
		refetchSeasons()
	}

	const columns: ColumnsType<any> = [
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
						<Link href={`/admin/season/${record.id}/stages`}>Stages</Link>
						<Link href={`/admin/season/${record.id}/projects`}>Projects</Link>
						<Link href={`/admin/season/${record.id}/reports`}>Reports</Link>
					</Space>
				</>
			),
		},
		{
			title: 'Period (UTC' + dayjs().format('Z') + ')',
			dataIndex: 'startedAt',
			key: 'startedAt',
			render: (value, data) => (
				<Text>
					From {dayjs(data.startedAt).format('LLL')} to{' '}
					{data.finishedAt ? dayjs(data.finishedAt).format('LLL') : 'unknown'}
				</Text>
			),
		},
		{ title: 'Status', dataIndex: 'status', key: 'status' },
		{
			key: 'actions',
			width: '1%',
			render(value, record) {
				return (
					<Space size="large">
						<Button onClick={() => handleChange(record.id)}>Edit</Button>
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
					<Title level={2}>Seasons</Title>
					<Button onClick={() => setShowModal(true)} type="primary">
						Add season
					</Button>
				</Row>
				<Table loading={isFetching} dataSource={response?.data} columns={columns} />
			</div>

			<SeasonModal seasonId={seasonId} open={showModal} onCancel={() => setShowModal(false)} onOk={handleSave} />
		</>
	)
}

SeasonsAdminPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonsAdminPage
