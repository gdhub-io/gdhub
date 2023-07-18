import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Button, Popconfirm, Row, Space, Table, Typography } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { BsCheckSquare, BsSquare } from 'react-icons/bs'
import { GoArrowLeft, GoTrash } from 'react-icons/go'
import { useQuery } from 'react-query'
import styles from './style.module.scss'

const { Title, Text } = Typography

const SeasonStagesAdminPage: NextPageWithLayout = () => {
	const router = useRouter()
	const [showModal, setShowModal] = useState(false)
	const { data: response, error } = useQuery(['admin', 'seasons'], () =>
		axios.get(`/api/admin/season/${router.query.id}/stages`)
	)

	const handleChange = () => {
		setShowModal(true)
	}

	const handleAddBtn = () => {}

	const handleDelete = () => {}

	const columns: ColumnsType<any> = [
		{
			title: '#',
			width: '3%',
			dataIndex: 'order',
			key: 'order',
			render: (value) => <Text type="secondary">{value}</Text>,
		},
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
		{
			title: 'Is Current',
			dataIndex: 'isCurrent',
			key: 'isCurrent',
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

	useEffect(() => {
		console.log(router, error, response)
	}, [error, response])

	if (error || !response?.data) {
		return <Text>Нет данных</Text>
	}

	return (
		<div className={styles.main}>
			<Row justify="space-between" align="middle">
				<Space align="center">
					<Link href="/admin/seasons">
						<Button icon={<GoArrowLeft />} type="text" style={{ marginBottom: '0.5em' }} />
					</Link>
					<Title level={2}>Season Stages</Title>
					<Text type="secondary">seasonId: {router.query.id}</Text>
				</Space>
				<Button onClick={handleAddBtn} type="primary">
					Add stage
				</Button>
			</Row>
			<Table dataSource={response?.data} columns={columns} sticky />
		</div>
	)
}

SeasonStagesAdminPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonStagesAdminPage
