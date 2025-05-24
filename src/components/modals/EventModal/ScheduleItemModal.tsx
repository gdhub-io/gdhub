import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Modal, Form, Input, DatePicker, Select, Avatar, Spin, message } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import debounce from 'lodash/debounce'
import qs from 'qs'
import { ScheduleItemFormValues } from '.'

const { RangePicker } = DatePicker

interface ScheduleItemModalProps {
	open: boolean
	onCancel: () => void
	onSubmit: (item: ScheduleItemFormValues) => void
	initialValues?: ScheduleItemFormValues
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
	const [searchSpeakersValue, setSearchSpeakersValue] = React.useState('')
	const [speakerOptions, setSpeakerOptions] = React.useState<
		{ label: string; value: string; avatar?: string; speciality?: string }[]
	>([])

	// on open modal, set initial values and refetch speakers
	useEffect(() => {
		if (open) {
			if (initialValues) {
				form.setFieldsValue({
					...initialValues,
					dates: [dayjs(initialValues?.startDate), dayjs(initialValues?.endDate)],
					speakers: initialValues?.speakers?.map((s: any) => s.id),
				})
			}

			refetchSpeakers()
		} else {
			form.resetFields()
			setSearchSpeakersValue('')
			setSpeakerOptions([])
		}
	}, [open, initialValues])

	const handleSearch = React.useMemo(
		() =>
			debounce((value: string) => {
				setSearchSpeakersValue(value)
			}, 500),
		[]
	)

	const {
		data: speakersData,
		isFetching,
		dataUpdatedAt: speakersDataUpdatedAt,
		refetch: refetchSpeakers,
	} = useQuery(
		['speakers-search', searchSpeakersValue, initialValues?.speakers?.length],
		() =>
			axios.get('/api/speakers/search', {
				params: { query: searchSpeakersValue, ids: initialValues?.speakers?.map((s) => s.id) },
				paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
			}),
		{
			enabled: (!!searchSpeakersValue || !!initialValues?.speakers?.length) && isAdmin,
		}
	)

	useEffect(() => {
		if (speakersData?.data) {
			setSpeakerOptions(
				speakersData.data.map((item: any) => ({
					label: item.name,
					value: item.id,
					avatar: item.image,
					speciality: item.speciality || item.direction || 'No speciality',
				}))
			)

			// form.setFieldsValue({
			// 	speakers: initialValues?.speakers?.map((s: any) => s.id),
			// })
		}
	}, [speakersData?.data, speakersDataUpdatedAt])

	const handleOk = async () => {
		try {
			const values = await form.validateFields()

			console.log('values', values)

			onSubmit({
				id: initialValues?.id || null,
				title: values.title,
				description: values.description,
				url: values.url,
				startDate: dayjs(values.dates[0]).toISOString(),
				endDate: dayjs(values.dates[1]).toISOString(),
				speakers: speakersData?.data?.filter((speaker: any) => values.speakers.includes(speaker.id)),
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
			centered
			onCancel={onCancel}
			onOk={handleOk}
			maskClosable={false}
			okText={t('common.save', 'Save')}
			cancelText={t('common.cancel', 'Cancel')}
			destroyOnClose
		>
			<Form form={form} variant="filled" layout="vertical" requiredMark="optional">
				<Form.Item
					label={t('event.schedule.dates', 'Dates')}
					name="dates"
					rules={[{ required: true, message: t('event.schedule.dates.required', 'Dates required') }]}
				>
					<RangePicker
						style={{ width: '100%' }}
						showTime={{ format: 'HH:mm', minuteStep: 5 }}
						format="YYYY-MM-DD HH:mm"
						id={{
							start: 'startDate',
							end: 'endDate',
						}}
					/>
				</Form.Item>

				<Form.Item
					label={t('event.schedule.speakers', 'Speakers')}
					name="speakers"
					rules={[{ required: true, message: t('event.schedule.speakers.required', 'At least one speaker required') }]}
				>
					<Select
						mode="multiple"
						allowClear
						showSearch
						placeholder={t('event.schedule.speakers.placeholder', 'Select speakers')}
						filterOption={false}
						onSearch={handleSearch}
						options={speakerOptions}
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
				</Form.Item>
				<Form.Item label={t('event.schedule.title', 'Title')} name="title">
					<Input placeholder={t('event.schedule.title.placeholder', 'Item title')} allowClear />
				</Form.Item>
				<Form.Item label={t('event.schedule.link', 'Link')} name="url">
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
