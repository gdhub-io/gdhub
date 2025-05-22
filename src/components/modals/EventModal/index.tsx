import React, { useState } from 'react'
import ModernTable from '@/components/ModernTable'
import { formatEventPeriod } from '@/helpers/format'
import { PlusOutlined, MoreOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { FaRegCalendarCheck } from '@react-icons/all-files/fa/FaRegCalendarCheck'
import { TbTrash } from '@react-icons/all-files/tb/TbTrash'
import { useMutation } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import {
	Modal,
	Form,
	Input,
	Button,
	Space,
	Upload,
	message,
	Typography,
	Divider,
	Row,
	Col,
	Popover,
	Spin,
	DraggerProps,
	Avatar,
	Dropdown,
	Menu,
} from 'antd'
import ImgCrop from 'antd-img-crop'
import axios from 'axios'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import ScheduleItemModal from './ScheduleItemModal'
import styles from './style.module.scss'

type LocalEventScheduleItem = prismaClient.EventScheduleItem & {
	speakers: (prismaClient.Speciality & { user: prismaClient.User })[]
}

interface EventModalProps {
	open: boolean
	onCancel: () => void
	onSubmit: () => void
	initialValues?: any
}

const { Text } = Typography

const EventModal: React.FC<EventModalProps> = ({ open, onCancel, onSubmit, initialValues }) => {
	const [form] = Form.useForm()
	const { t, getLanguage } = useTolgee()
	const [schedule, setSchedule] = useState<LocalEventScheduleItem[]>(initialValues?.schedule || [])
	const [imageUrl, setImageUrl] = useState<string | undefined>(initialValues?.image)
	const [speakersOptions, setSpeakersOptions] = useState<any[]>([])
	const [scheduleItemModalOpen, setScheduleItemModalOpen] = useState(false)
	const { data: session } = useSession()
	const isAdmin =
		session?.user?.role === 'Admin' || session?.user?.role === 'admin' || process.env.NODE_ENV === 'development'
	const currentUser = session?.user
	const [imageProcessing, setImageProcessing] = useState(false)
	const [fileList, setFileList] = useState<any[]>([])
	const [editingScheduleItemIdx, setEditingScheduleItemIdx] = useState<number | null>(null)

	const { mutate: createEvent } = useMutation({
		mutationFn: (values: any) => axios.post('/api/user/event', values),
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
		setEditingScheduleItemIdx(null)
		setScheduleItemModalOpen(true)
	}

	const handleScheduleItemModalCancel = () => {
		setScheduleItemModalOpen(false)
		setEditingScheduleItemIdx(null)
	}

	const handleScheduleItemModalSubmit = (item: LocalEventScheduleItem) => {
		if (editingScheduleItemIdx !== null) {
			const updated = [...schedule]
			updated[editingScheduleItemIdx] = item
			setSchedule(updated)
		} else {
			setSchedule([...schedule, item])
		}
		setScheduleItemModalOpen(false)
		setEditingScheduleItemIdx(null)
	}

	// Удалить item расписания
	const removeScheduleItem = (idx: number) => {
		setSchedule(schedule.filter((_, i) => i !== idx))
	}

	// Обновить поле расписания
	const updateScheduleItem = (idx: number, field: keyof LocalEventScheduleItem, value: any) => {
		const updated = [...schedule]
		updated[idx][field] = value
		setSchedule(updated)
	}

	// Сохранить событие
	const handleOk = async () => {
		try {
			const values = await form.validateFields()

			if (schedule.length === 0 && !values.schedule) {
				message.error('Required to add at least one schedule item')
				return
			}

			await createEvent({ ...values, schedule })

			onSubmit()

			form.resetFields()
			setSchedule([])
			setImageUrl(undefined)
		} catch (err) {
			// Ошибки валидации
		}
	}

	const handleCancel = () => {
		form.resetFields()
		setSchedule([])
		setImageUrl(undefined)
		setFileList([])
		onCancel()
	}

	const handleEditScheduleItem = (idx: number) => {
		setEditingScheduleItemIdx(idx)
		setScheduleItemModalOpen(true)
	}

	return (
		<Modal
			open={open}
			onCancel={handleCancel}
			onOk={handleOk}
			centered
			title={
				<Space>
					<FaRegCalendarCheck size={24} />
					{t('event.modal.title', 'Event')}
				</Space>
			}
			width={720}
			okText={<T>Create</T>}
			cancelText={<T>Cancel</T>}
			destroyOnClose
			maskClosable={false}
		>
			<Form form={form} variant="filled" layout="vertical" initialValues={initialValues} requiredMark="optional">
				<Row gutter={16}>
					<Col span={8}>
						{!imageUrl ? (
							<Form.Item label={t('event.modal.image', 'Image')} name="image" valuePropName="file" noStyle>
								<ImgCrop aspect={4 / 5} cropShape="rect" showGrid showReset>
									<Upload.Dragger {...uploadProps} className={styles.cover}>
										<p className="ant-upload-text">{t('event.modal.image.add', 'Add event image')}</p>
										<p className="ant-upload-hint">
											{t('event.modal.image.hint', 'Click or drag image here. JPG, PNG. 4:5 recommended.')}
										</p>
									</Upload.Dragger>
								</ImgCrop>
							</Form.Item>
						) : (
							<Spin spinning={imageProcessing}>
								<div className={styles.cover}>
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
						)}
					</Col>
					<Col span={16}>
						<Form.Item
							label={t('event.modal.title.label', 'Title')}
							name="title"
							rules={[{ required: true, message: t('event.modal.title.required', 'Title is required') }]}
						>
							<Input placeholder={t('event.modal.title.placeholder', 'Event title')} />
						</Form.Item>
						<Form.Item
							label={t('event.modal.description.label', 'Short Description')}
							name="description"
							rules={[{ required: true, message: t('event.modal.description.required', 'Description is required') }]}
						>
							<Input.TextArea rows={3} placeholder={t('event.modal.description.placeholder', 'Event description')} />
						</Form.Item>
						<Form.Item label={t('event.modal.link', 'Link')} name="link">
							<Input placeholder={t('event.modal.link.placeholder', 'https://')} />
						</Form.Item>
					</Col>
				</Row>
				<Divider orientation="left" style={{ marginTop: 16 }}>
					{t('event.modal.schedule', 'Schedule')}
				</Divider>
				{schedule.length > 0 && (
					<ModernTable
						size="small"
						dataSource={schedule.map((item, idx) => ({ ...item, key: idx }))}
						pagination={false}
						columns={[
							{
								title: t('event.modal.schedule.period', 'Date'),
								dataIndex: 'start',
								key: 'period',
								render: (start: string, record: any) => formatEventPeriod(start, record.end, getLanguage()),
							},
							{
								title: t('event.modal.schedule.title', 'Title'),
								dataIndex: 'title',
								key: 'title',
							},
							{
								title: t('event.modal.schedule.speakers', 'Speakers'),
								dataIndex: 'speakers',
								key: 'speakers',
								render: (speakers: any[]) => {
									const speakersArr = Array.isArray(speakers) ? speakers : speakers ? [speakers] : []
									return (
										<span style={{ display: 'flex', gap: 8 }}>
											{speakersArr.map((id) => {
												const speaker = speakersOptions.find((s) => s.value === id)
												if (!speaker) return null
												return (
													<span key={id} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
														<Avatar size={24} src={speaker.avatar} style={{ marginRight: 4 }} />
														<span>{speaker.label}</span>
													</span>
												)
											})}
										</span>
									)
								},
							},
							{
								title: '',
								key: 'actions',
								width: 48,
								render: (_: any, record: any, idx: number) => {
									const menu = (
										<Menu>
											<Menu.Item key="edit" onClick={() => handleEditScheduleItem(idx)}>
												{t('Edit', 'Edit')}
											</Menu.Item>
											<Menu.Item key="delete" onClick={() => removeScheduleItem(idx)} danger>
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
				initialValues={editingScheduleItemIdx !== null ? schedule[editingScheduleItemIdx] : undefined}
				speakersOptions={speakersOptions}
				isAdmin={isAdmin}
				currentUser={currentUser ? { label: currentUser.name, value: currentUser.id } : undefined}
			/>
		</Modal>
	)
}

export default EventModal
