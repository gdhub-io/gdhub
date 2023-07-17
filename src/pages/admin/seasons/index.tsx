import { useState } from 'react'
import SeasonModal from '@/components/modals/SeasonModal'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Button, Popconfirm, Row, Space, Table, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { BsCheckSquare, BsSquare } from 'react-icons/bs'
import { GoTrash } from 'react-icons/go'
import { useQuery } from 'react-query'
import styles from './style.module.scss'

const { Title, Text } = Typography

const SeasonsAdminPage: NextPageWithLayout = () => {
	const [showModal, setShowModal] = useState(false)
	const { data: response, error } = useQuery(['admin', 'seasons'], () => axios.get('/api/admin/seasons'))

	const handleChange = () => {
		setShowModal(true)
	}

	const handleDelete = () => {}

	const handleSave = () => {
		setShowModal(false)
	}

	const columns: ColumnsType<any> = [
		{ title: 'Title', dataIndex: 'name', key: 'name', render: (value) => <Text strong>{value}</Text> },
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
			title: 'Is Active',
			dataIndex: 'isActive',
			key: 'isActive',
			render(value) {
				return value ? <BsCheckSquare /> : <BsSquare />
			},
		},
		{
			key: 'actions',
			width: '1%',
			render(value, record) {
				return (
					<Space size="large">
						<Link href={`/admin/season/${record.id}/stages`}>Stages</Link>
						<Button onClick={handleChange}>Edit</Button>
						<Popconfirm title="Are you sure you want to delete this entry?" onConfirm={handleDelete}>
							<Button danger type="text">
								<GoTrash />
							</Button>
						</Popconfirm>
					</Space>
				)
			},
		},
	]

	if (error || !response?.data) {
		return <Text>Нет данных</Text>
	}

	return (
		<>
			<div className={styles.main}>
				<Row justify="space-between" align="middle">
					<Title level={2}>Seasons</Title>
					<Button onClick={() => setShowModal(true)} type="primary">
						Add season
					</Button>
				</Row>
				<Table dataSource={response?.data} columns={columns} />
			</div>

			<SeasonModal open={showModal} onCancel={() => setShowModal(false)} onOk={handleSave} />
		</>
	)
}

SeasonsAdminPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonsAdminPage
