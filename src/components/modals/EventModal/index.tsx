import React, { useEffect, useState } from 'react'
import ModernTable from '@/components/ModernTable'
import { formatEventPeriod } from '@/helpers/format'
import { hasRole } from '@/helpers/user'
import { PlusOutlined, MoreOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { FaRegCalendarCheck } from '@react-icons/all-files/fa/FaRegCalendarCheck'
import { TbTrash } from '@react-icons/all-files/tb/TbTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import {
	Modal,
	Form,
	Input,
	Button,
	Space,
	Upload,
	message,
	Divider,
	Row,
	Col,
	Popover,
	Spin,
	DraggerProps,
	Avatar,
	Dropdown,
	Menu,
	Typography,
} from 'antd'
import ImgCrop from 'antd-img-crop'
import axios from 'axios'
import _ from 'lodash'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import ScheduleItemModal from './ScheduleItemModal'
import styles from './style.module.scss'

const { Text } = Typography

interface EventModalProps {
	open: boolean
	eventId?: string
	eventType?: prismaClient.EventType
	onCancel: () => void
	onSubmit: () => void
	initialValues?: any
}

export type ScheduleItemFormValues = {
	id: string | null
	title?: string
	description?: string
	url?: string
	startDate: string
	endDate: string
	speakers: { name: string; speciality: string; id: string }[]
	format?: prismaClient.$Enums.EventFormat
	language?: prismaClient.$Enums.Language
	directionId: string
}

const EventModal: React.FC<EventModalProps> = ({ open, eventType, onCancel, onSubmit, initialValues, eventId }) => {
	const [form] = Form.useForm()
	const { t, getLanguage } = useTolgee()
	const [schedule, setSchedule] = useState<ScheduleItemFormValues[]>(initialValues?.schedule || [])
	const [scheduleHasChanges, setScheduleHasChanges] = useState(false)
	const [imageUrl, setImageUrl] = useState<string | undefined>(initialValues?.image)
	const [scheduleItemModalOpen, setScheduleItemModalOpen] = useState(false)
	const { data: session } = useSession()
	const isAdmin = hasRole(prismaClient.UserRole.Admin, { data: session })
	const isBigEvent =
		eventType === prismaClient.$Enums.EventType.GameLab || eventType === prismaClient.$Enums.EventType.Conference
	const [imageProcessing, setImageProcessing] = useState(false)
	const [fileList, setFileList] = useState<any[]>([])
	const [editingScheduleItemId, setEditingScheduleItemId] = useState<string | null>(null)

	const { data: eventData, isLoading: isEventLoading } = useQuery({
		queryKey: ['event', eventId],
		queryFn: () => axios.get(`/api/user/event/${eventId}`),
		enabled: !!eventId,
	})

	useEffect(() => {
		if (eventData?.data) {
			form.resetFields()
			form.setFieldsValue({
				title: eventData.data.title,
				shortDescription: eventData.data.shortDescription,
				description: eventData.data.description,
				link: eventData.data.link,
				image: eventData.data.image,
			})

			setSchedule(
				eventData.data.schedule?.map((item: any) => ({
					id: item.id,
					title: item.title,
					description: item.description,
					link: item.link,
					startDate: item.startDate,
					endDate: item.endDate,
					directionId: item.directionId,
					format: item.format,
					language: item.language,
					speakers: item.speakers?.length
						? item.speakers.map((speciality: any) => ({
								id: speciality.id,
								name: speciality.user?.profile?.name,
								speciality: speciality.name,
								image: speciality.user?.image,
							}))
						: [],
				}))
			)

			if (eventData.data.image) {
				setImageUrl(eventData.data.image)
				setFileList([
					{
						uid: eventData.data.image,
						name: eventData.data.image,
						status: 'done',
						url: eventData.data.image,
					},
				])
			}
		}
	}, [eventData?.data])

	const { data: workDirections } = useQuery({
		queryKey: ['workDirections'],
		queryFn: () => axios.get<prismaClient.WorkDirection[]>('/api/dictionary/work-directions'),
		staleTime: Infinity,
	})

	const { mutateAsync: createEvent, isPending: isEventCreating } = useMutation({
		mutationFn: (values: any) => axios.post('/api/user/event', values),
		onSuccess: () => {
			onSubmit()
		},
	})

	const { mutateAsync: updateEvent, isPending: isEventUpdating } = useMutation({
		mutationFn: ({ _eventId, data }: any) => axios.put(`/api/user/event/${_eventId}`, data),
		onSuccess: () => {
			onSubmit()
		},
	})

	const uploadEventImage = async (file: any) => {
		try {
			const data = new FormData()
			data.append('file', file)
			data.append('filename', 'event-image')
			data.append('tag', 'event')
			const res = await axios.post('/api/file', data)
			return await res.data
		} catch (error) {
			console.error(error)
		}
	}

	const removeEventImage = async (fileUrl: string) => {
		try {
			await axios.delete('/api/file', { params: { fileUrl } })
			setImageUrl(undefined)
			form.setFieldValue('image', undefined)
		} catch (error) {
			console.error(error)
		}
	}

	const uploadProps: DraggerProps = {
		name: 'file',
		multiple: false,
		accept: 'image/png, image/jpeg',
		customRequest: async (options: any) => {
			const { file, onSuccess, onError } = options
			setImageProcessing(true)
			try {
				const uploadedFileData = await uploadEventImage(file)
				setImageUrl(uploadedFileData.url)
				setFileList([
					{
						uid: file.uid || Date.now(),
						name: file.name,
						status: 'done',
						url: uploadedFileData.url,
					},
				])
				form.setFieldValue('image', uploadedFileData.url)
				if (onSuccess) onSuccess('ok')
			} catch (e) {
				if (onError) onError(e)
			}
			setImageProcessing(false)
		},
		fileList,
		onRemove: async (file: any) => {
			if (file.url) {
				await removeEventImage(file.url)
			}
			setFileList([])
			setImageUrl(undefined)
			form.setFieldValue('image', undefined)
		},
		showUploadList: false,
	}

	const handleImageDelete = async () => {
		if (!imageUrl) return
		setImageProcessing(true)
		await removeEventImage(imageUrl)
		setImageProcessing(false)
	}

	// Добавить новый item расписания
	const handleAddScheduleItem = () => {
		setEditingScheduleItemId(null)
		setScheduleItemModalOpen(true)
	}

	const handleScheduleItemModalCancel = () => {
		setScheduleItemModalOpen(false)
		setEditingScheduleItemId(null)
	}

	const handleScheduleItemModalSubmit = (item: ScheduleItemFormValues) => {
		if (editingScheduleItemId !== null) {
			updateScheduleItem(editingScheduleItemId, item)
		} else {
			addNewScheduleItem(item)
		}

		setScheduleHasChanges(true)
		setScheduleItemModalOpen(false)
		setEditingScheduleItemId(null)
	}

	// Удалить item расписания
	const removeScheduleItem = (id: string) => {
		setSchedule(schedule.filter((i) => i.id !== id))
		setScheduleHasChanges(true)
	}

	// Обновить поле расписания
	const updateScheduleItem = (id: string, item: ScheduleItemFormValues) => {
		const updated = [...schedule]
		const idx = updated.findIndex((i) => i.id === id)

		if (idx !== -1) {
			updated[idx] = item
		}

		setSchedule(updated)
	}

	const addNewScheduleItem = (item: ScheduleItemFormValues) => {
		setSchedule((prev) => {
			if (!eventId) {
				// Для новых событий id = индекс (строкой)
				return [...prev, { ...item, id: String(prev.length) }]
			}
			return [...prev, item]
		})

		setScheduleHasChanges(true)
	}

	// Сохранить событие
	const handleOk = async () => {
		try {
			const values = await form.validateFields()

			// if (schedule.length === 0 && !values.schedule) {
			// 	message.error('Required to add at least one schedule item')
			// 	return
			// }

			if (eventId) {
				await updateEvent({
					_eventId: eventId,
					data: {
						...values,
						image: imageUrl,
						schedule: scheduleHasChanges
							? schedule.map((item) => ({
									...item,
									speakers: item.speakers?.length ? item.speakers.map((s) => s.id) : [],
								}))
							: undefined,
					},
				})
			} else {
				await createEvent({
					...values,
					image: imageUrl,
					type: eventType,
					schedule: schedule.map((item) => ({
						...item,
						speakers: item.speakers?.length ? item.speakers.map((s) => s.id) : [],
					})),
				})

				message.success(t('event.modal.success', 'Event created successfully'))
			}

			form.resetFields()
			setSchedule([])
			setImageUrl(undefined)
		} catch (err) {
			console.error(err)
			message.error(t('event.modal.error', 'Error creating event'))
		}
	}

	const handleCancel = () => {
		form.resetFields()
		setSchedule([])
		setImageUrl(undefined)
		setFileList([])
		onCancel()
	}

	const handleEditScheduleItem = (id: string) => {
		setEditingScheduleItemId(id)
		setScheduleItemModalOpen(true)
	}

	const eventLabel = (eventType: prismaClient.$Enums.EventType) => {
		switch (eventType) {
			case prismaClient.$Enums.EventType.Meetup:
				return t('event.modal.meetup', 'Meetup')
			case prismaClient.$Enums.EventType.Workshop:
				return t('event.modal.workshop', 'Workshop')
			case prismaClient.$Enums.EventType.GameJam:
				return t('event.modal.gamejam', 'Game Jam')
			case prismaClient.$Enums.EventType.GameLab:
				return t('event.modal.gamelab', 'Game Lab')
			case prismaClient.$Enums.EventType.Conference:
				return t('event.modal.conference', 'Conference')
			default:
				return t('event.modal.event', 'Event')
		}
	}

	if (!eventType) return null

	return (
		<Modal
			open={open}
			onCancel={handleCancel}
			confirmLoading={isEventCreating || isEventUpdating}
			onOk={handleOk}
			width={1000}
			centered
			title={
				eventId ? (
					<Space>
						<FaRegCalendarCheck size={24} />
						{t('event.modal.edit', 'Edit event')}
					</Space>
				) : (
					<Space>
						<FaRegCalendarCheck size={24} />
						{t('event.modal.title', 'Add {eventType}', { eventType: eventLabel(eventType) })}
					</Space>
				)
			}
			okText={eventId ? t('event.modal.save', 'Save') : t('event.modal.create', 'Save draft')}
			cancelText={t('event.modal.cancel', 'Cancel')}
			destroyOnClose
			maskClosable={false}
		>
			<Form form={form} variant="filled" layout="vertical" initialValues={{ ...initialValues }} requiredMark="optional">
				<Row gutter={16}>
					{isBigEvent ? (
						<Col span={24} style={{ marginBottom: 24 }}>
							{!imageUrl ? (
								<Form.Item label={t('event.modal.image', 'Image')} name="image" valuePropName="image" noStyle>
									<ImgCrop aspect={16 / 9} cropShape="rect" showGrid showReset>
										<Upload.Dragger
											{...uploadProps}
											className={styles.cover}
											style={{ aspectRatio: '16 / 9', width: '100%', maxHeight: 500 }}
										>
											<p className="ant-upload-text">{t('event.modal.image.add', 'Add event image')}</p>
											<p className="ant-upload-hint">
												{t('event.modal.image.hint', 'Click or drag image here. JPG, PNG. 16:9 recommended.')}
											</p>
										</Upload.Dragger>
									</ImgCrop>
								</Form.Item>
							) : (
								<Spin spinning={imageProcessing}>
									<div className={styles.cover} style={{ aspectRatio: '16 / 9' }}>
										<Image src={imageUrl + '?w=1200'} fill alt="" />
										<Popover content={t('event.modal.image.deletePopover', 'Remove image')}>
											<Button
												shape="circle"
												type="primary"
												className="remove-cover-btn"
												onClick={handleImageDelete}
												icon={<TbTrash size={18} style={{ marginTop: 2 }} />}
											/>
										</Popover>
									</div>
								</Spin>
							)}
						</Col>
					) : null}
					<Col span={isBigEvent ? 24 : 8}>
						{!isBigEvent &&
							(!imageUrl ? (
								<Form.Item label={t('event.modal.image', 'Image')} name="image" valuePropName="image" noStyle>
									<ImgCrop aspect={4 / 5} cropShape="rect" showGrid showReset>
										<Upload.Dragger
											{...uploadProps}
											className={styles.cover}
											style={{ aspectRatio: '4 / 5', maxHeight: 500 }}
										>
											<p className="ant-upload-text">{t('event.modal.image.add', 'Add event image')}</p>
											<p className="ant-upload-hint">
												{t('event.modal.image.hint', 'Click or drag image here. JPG, PNG. 4:5 recommended.')}
											</p>
										</Upload.Dragger>
									</ImgCrop>
								</Form.Item>
							) : (
								<Spin spinning={imageProcessing}>
									<div className={styles.cover} style={{ aspectRatio: '4 / 5' }}>
										<Image src={imageUrl + '?w=750'} fill alt="" />
										<Popover content={t('event.modal.image.deletePopover', 'Remove image')}>
											<Button
												shape="circle"
												type="primary"
												className="remove-cover-btn"
												onClick={handleImageDelete}
												icon={<TbTrash size={18} style={{ marginTop: 2 }} />}
											/>
										</Popover>
									</div>
								</Spin>
							))}
					</Col>
					<Col span={isBigEvent ? 24 : 16}>
						<Form.Item
							label={t('event.modal.title.label', 'Title')}
							name="title"
							rules={[{ required: true, message: t('event.modal.title.required', 'Title is required') }]}
						>
							<Input placeholder={t('event.modal.title.placeholder', 'Event title')} />
						</Form.Item>
						<Form.Item label={t('event.modal.shortDescription.label', 'Short Description')} name="shortDescription">
							<Input.TextArea
								rows={2}
								maxLength={90}
								showCount
								autoSize={{ minRows: 2, maxRows: 3 }}
								placeholder={t('event.modal.shortDescription.placeholder', 'Event short description')}
							/>
						</Form.Item>
						<Form.Item
							label={t('event.modal.description.label', 'Description')}
							name="description"
							rules={[{ required: true, message: t('event.modal.description.required', 'Description is required') }]}
						>
							<Input.TextArea
								rows={5}
								maxLength={20000}
								showCount
								autoSize={{ minRows: 5, maxRows: 10 }}
								placeholder={t('event.modal.description.placeholder', 'Event description')}
							/>
						</Form.Item>

						<Form.Item label={t('event.modal.link', 'Link')} name="url">
							<Input placeholder={t('event.modal.link.placeholder', 'https://')} />
						</Form.Item>
					</Col>
				</Row>
				<Divider orientation="left" style={{ marginTop: 16 }}>
					{t('event.modal.schedule', 'Schedule')}
				</Divider>
				<Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
					{t(
						'event.modal.schedule.hint',
						'You can add one or multiple schedule items to the event. Each item can have multiple speakers.'
					)}
				</Typography.Paragraph>
				{schedule.length > 0 && (
					<ModernTable
						size="small"
						dataSource={_.orderBy(schedule, ['start'], 'asc')}
						pagination={false}
						rowKey="id"
						columns={[
							{
								key: 'index',
								render: (_, __, idx: number) => {
									return idx + 1
								},
							},
							{
								title: t('event.modal.schedule.speakers', 'Speakers'),
								dataIndex: 'speakers',
								key: 'speakers',
								render: (speakers) => {
									const speakersArr = Array.isArray(speakers) ? speakers : speakers ? [speakers] : []
									return (
										<Space direction="vertical">
											{speakersArr.map((speaker) => {
												return (
													<span key={speaker.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
														{speaker.image ? (
															<Avatar size={36} src={speaker.image} style={{ marginRight: 8 }} />
														) : (
															<Avatar size={36} style={{ marginRight: 8 }}>
																{speaker.name.charAt(0).toUpperCase()}
															</Avatar>
														)}
														<Space direction="vertical" size={0}>
															<Text>{speaker.name}</Text>
															<Text type="secondary" style={{ fontSize: 12 }}>
																{speaker.speciality}
															</Text>
														</Space>
													</span>
												)
											})}
										</Space>
									)
								},
							},
							{
								title: t('event.modal.schedule.title', 'Title'),
								dataIndex: 'title',
								key: 'title',
								render: (title: string, record: any) => {
									return <Text>{title || '-'}</Text>
								},
							},
							{
								title: t('event.modal.schedule.period', 'Date'),
								dataIndex: 'start',
								key: 'period',
								render: (_, record: any) => {
									const startDate = record.startDate
									const endDate = record.endDate

									return <Text>{formatEventPeriod(startDate, endDate, getLanguage())}</Text>
								},
							},
							{
								title: '',
								key: 'actions',
								width: 48,
								render: (_: any, record: any, idx: number) => {
									const menu = (
										<Menu>
											<Menu.Item key="edit" onClick={() => handleEditScheduleItem(record.id)}>
												{t('Edit', 'Edit')}
											</Menu.Item>
											<Menu.Item key="delete" onClick={() => removeScheduleItem(record.id)} danger>
												{t('Delete', 'Delete')}
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
						]}
						style={{ marginBottom: 16 }}
					/>
				)}
				<Button
					block
					icon={<PlusOutlined />}
					onClick={handleAddScheduleItem}
					type="text"
					className={styles.addItemButton}
				>
					{t('event.modal.schedule.add', 'Add item')}
				</Button>
			</Form>

			<ScheduleItemModal
				open={scheduleItemModalOpen}
				onCancel={handleScheduleItemModalCancel}
				onSubmit={handleScheduleItemModalSubmit}
				initialValues={editingScheduleItemId ? schedule.find((i) => i.id === editingScheduleItemId) : undefined}
				isAdmin={isAdmin}
			/>
		</Modal>
	)
}

export default EventModal
