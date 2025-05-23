import React from 'react'
import CreateEventButton from '@/components/events/CreateEventButton'
import ModernTable from '@/components/ModernTable'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { MoreOutlined } from '@ant-design/icons'
import { FaChalkboardTeacher } from '@react-icons/all-files/fa/FaChalkboardTeacher'
import { FaMicroscope } from '@react-icons/all-files/fa/FaMicroscope'
import { FaRegCalendarCheck } from '@react-icons/all-files/fa/FaRegCalendarCheck'
import { FaUsers } from '@react-icons/all-files/fa/FaUsers'
import { GiGamepad } from '@react-icons/all-files/gi/GiGamepad'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Button, Dropdown, Menu, Popconfirm, message, Space, Typography, theme } from 'antd'
import type { Breakpoint } from 'antd/es/_util/responsiveObserver'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Text } = Typography

function getTypeIcon(type: string, size = 20) {
	switch (type) {
		case 'MEETUP':
			return <FaUsers size={size} />
		case 'GAMEJAM':
			return <GiGamepad size={size} />
		case 'WORKSHOP':
			return <FaChalkboardTeacher size={size} />
		case 'GAMELAB':
			return <FaMicroscope size={size} />
		case 'CONFERENCE':
			return <FaRegCalendarCheck size={size} />
		default:
			return null
	}
}

const MyEventsPage: NextPageWithLayout = () => {
	const { t } = useTolgee()
	const router = useRouter()
	const { token } = theme.useToken()
	const queryClient = useQueryClient()

	// Получение событий пользователя
	const { data, isLoading } = useQuery(['my-events'], () => axios.get('/api/user/events').then((res) => res.data))

	// Мутация для удаления события
	const { mutate: deleteEvent } = useMutation((id: string) => axios.delete('/api/user/event', { params: { id } }), {
		onSuccess: () => {
			message.success(t('event.delete.success', 'Event deleted'))
			queryClient.invalidateQueries(['my-events'])
		},
		onError: () => {
			message.error(t('event.delete.error', 'Error deleting event'))
		},
	})

	// Обработчик редактирования (заглушка)
	const handleEdit = (id: string) => {
		// router.push(`/hub/events/edit/${id}`)
		message.info(t('event.edit.soon', 'Edit coming soon'))
	}

	const columns: ColumnsType<any> = [
		{
			title: t('event.title', 'Title'),
			dataIndex: 'title',
			key: 'title',
			render: (value: string, record: any) => (
				<Space>
					{getTypeIcon(record.type)}
					<Text strong>{value}</Text>
				</Space>
			),
		},
		{
			title: t('event.type', 'Type'),
			dataIndex: 'type',
			key: 'type',
			render: (value: string) => <Text>{value}</Text>,
			responsive: ['md' as Breakpoint],
		},
		{
			title: t('event.dates', 'Dates'),
			dataIndex: 'schedule',
			key: 'schedule',
			render: (schedule: any[]) => {
				if (!schedule || !schedule.length) return null
				const first = schedule[0]
				const last = schedule[schedule.length - 1]
				return (
					<Text type="secondary">
						{dayjs(first.startDate).format('LL')} - {dayjs(last.endDate).format('LL')}
					</Text>
				)
			},
			responsive: ['md' as Breakpoint],
		},
		{
			key: 'actions',
			width: 48,
			render: (_: any, record: any) => {
				const menu = (
					<Menu>
						<Menu.Item key="edit" onClick={() => handleEdit(record.id)}>
							{t('event.edit', 'Edit')}
						</Menu.Item>
						<Menu.Item key="delete">
							<Popconfirm
								title={t('event.delete.confirm', 'Delete this event?')}
								okText={t('event.delete', 'Delete')}
								cancelText={t('event.cancel', 'Cancel')}
								onConfirm={() => deleteEvent(record.id)}
							>
								<span style={{ color: token.colorError }}>{t('event.delete', 'Delete')}</span>
							</Popconfirm>
						</Menu.Item>
					</Menu>
				)
				return (
					<Dropdown overlay={menu} trigger={['click']}>
						<Button type="text" icon={<MoreOutlined />} />
					</Dropdown>
				)
			},
		},
	]

	return (
		<ProtectedLayout
			title={t('page.myEvents.title', 'My Events')}
			seo={{ openGraph: { type: 'website', url: router.asPath } }}
			extra={<CreateEventButton onCreation={() => queryClient.invalidateQueries(['my-events'])} />}
			showBackButton
			backButtonUrl="/hub/events"
		>
			<div className={styles.container}>
				<ModernTable
					columns={columns}
					dataSource={data?.map((e: any) => ({ ...e, key: e.id }))}
					loading={isLoading}
					showHeader
					pagination={false}
				/>
			</div>
		</ProtectedLayout>
	)
}

export default MyEventsPage
