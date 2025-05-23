import React, { useEffect } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Modal, Form, Input, DatePicker, Select, Row, Col, Avatar, Spin, message } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import debounce from 'lodash/debounce'

type LocalEventScheduleItem = prismaClient.EventScheduleItem & {
	speakers: (Pick<prismaClient.Speciality, 'name' | 'id'> & {
		user: Pick<prismaClient.User, 'name' | 'id' | 'image'> & { profile: Pick<prismaClient.Profile, 'name'> }
	})[]
}

interface ScheduleItemModalProps {
	open: boolean
	onCancel: () => void
	onSubmit: (item: LocalEventScheduleItem) => void
	initialValues?: Partial<LocalEventScheduleItem>
	isAdmin: boolean
	currentUser?: { label: string; value: string }
}

const ScheduleItemModal: React.FC<ScheduleItemModalProps> = ({
	open,
	onCancel,
	onSubmit,
	initialValues,
	isAdmin,
	currentUser,
}) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()

	const [searchValue, setSearchValue] = React.useState('')
	const [options, setOptions] = React.useState<
		{ label: string; value: string; avatar?: string; speciality?: string }[]
	>([])

	useEffect(() => {
		if (open) refetchSpeakers()
	}, [open])

	const handleSearch = React.useMemo(
		() =>
			debounce((value: string) => {
				setSearchValue(value)
			}, 500),
		[]
	)

	const {
		data: speakersData,
		isFetching,
		refetch: refetchSpeakers,
	} = useQuery({
		queryKey: ['speakers-search', searchValue],
		queryFn: async () => {
			// if (!searchValue) return []
			const res = await axios.get('/api/speakers/search', { params: { query: searchValue } })
			return res.data
		},
		enabled: !!searchValue && isAdmin,
	})

	React.useEffect(() => {
		if (speakersData && Array.isArray(speakersData)) {
			setOptions(
				speakersData.map((item: any) => ({
					label: item.name,
					value: item.id,
					avatar: item.image,
					speciality: item.speciality || item.direction || 'No speciality',
				}))
			)
		} else {
			setOptions([])
		}
	}, [speakersData])

	React.useEffect(() => {
		if (!open) setOptions([])
	}, [open])

	const handleOk = async () => {
		try {
			const values = await form.validateFields()

			console.log('values', values)

			onSubmit({
				...values,
				start: values.start.toISOString(),
				end: values.end.toISOString(),
				speakers: speakersData?.filter((speaker: any) => values.speakers.includes(speaker.id)),
			})

			form.resetFields()
		} catch (err) {
			console.log('error', err)
			message.error(t('event.schedule.modal.error', 'Error saving schedule item'))
		}
	}

	return (
		<Modal
			open={open}
			title={t('event.schedule.modal.title', 'Schedule Item')}
			onCancel={onCancel}
			onOk={handleOk}
			okText={t('common.save', 'Save')}
			cancelText={t('common.cancel', 'Cancel')}
			destroyOnClose
		>
			<Form
				form={form}
				variant="filled"
				layout="vertical"
				initialValues={{
					...initialValues,
					start: initialValues?.startDate ? dayjs(initialValues.startDate) : undefined,
					end: initialValues?.endDate ? dayjs(initialValues.endDate) : undefined,
					speakers: isAdmin ? initialValues?.speakers : currentUser,
				}}
				requiredMark="optional"
			>
				<Row gutter={8}>
					<Col span={12}>
						<Form.Item
							label={t('event.schedule.start', 'Start')}
							name="start"
							rules={[{ required: true, message: t('event.schedule.start.required', 'Start date/time required') }]}
						>
							<DatePicker
								showTime={{ format: 'HH:mm', minuteStep: 5 }}
								format="YYYY-MM-DD HH:mm"
								style={{ width: '100%' }}
							/>
						</Form.Item>
					</Col>
					<Col span={12}>
						<Form.Item
							label={t('event.schedule.end', 'End')}
							name="end"
							rules={[{ required: true, message: t('event.schedule.end.required', 'End date/time required') }]}
						>
							<DatePicker
								showTime={{ format: 'HH:mm', minuteStep: 5 }}
								format="YYYY-MM-DD HH:mm"
								style={{ width: '100%' }}
							/>
						</Form.Item>
					</Col>
				</Row>
				<Form.Item
					label={t('event.schedule.speakers', 'Speakers')}
					name="speakers"
					rules={[{ required: true, message: t('event.schedule.speakers.required', 'At least one speaker required') }]}
				>
					{isAdmin ? (
						<Select
							mode="multiple"
							allowClear
							showSearch
							placeholder={t('event.schedule.speakers.placeholder', 'Select speakers')}
							filterOption={false}
							onSearch={handleSearch}
							options={options}
							loading={isFetching}
							style={{ width: '100%' }}
							optionLabelProp="label"
							notFoundContent={isFetching ? <Spin size="small" /> : null}
							optionRender={(option) => {
								const { label, avatar, speciality } = option.data
								return (
									<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<Avatar size={24} src={avatar} style={{ marginRight: 8 }}>
											{!avatar && label ? label[0] : null}
										</Avatar>
										<div>
											<div>{label}</div>
											<div style={{ fontSize: 12, color: '#888' }}>{speciality || 'No speciality'}</div>
										</div>
									</div>
								)
							}}
						/>
					) : (
						<Select
							mode="multiple"
							disabled
							value={currentUser ? [currentUser.value] : []}
							options={currentUser ? [currentUser] : []}
							style={{ width: '100%' }}
						/>
					)}
				</Form.Item>
				<Form.Item label={t('event.schedule.title', 'Title')} name="title">
					<Input placeholder={t('event.schedule.title.placeholder', 'Item title')} allowClear />
				</Form.Item>
				<Form.Item label={t('event.schedule.link', 'Link')} name="link">
					<Input placeholder={t('event.schedule.link.placeholder', 'https://')} allowClear />
				</Form.Item>
				<Form.Item label={t('event.schedule.description', 'Description')} name="description">
					<Input.TextArea
						rows={2}
						placeholder={t('event.schedule.description.placeholder', 'Item description')}
						allowClear
					/>
				</Form.Item>
			</Form>
		</Modal>
	)
}

export default ScheduleItemModal
