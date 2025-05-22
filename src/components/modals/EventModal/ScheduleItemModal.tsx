import React from 'react'
import { useTolgee } from '@tolgee/react'
import { Modal, Form, Input, DatePicker, Select, Row, Col } from 'antd'
import dayjs from 'dayjs'

interface ScheduleItem {
	title?: string
	description?: string
	start: string
	end: string
	speakers: string[]
	link?: string
}

interface ScheduleItemModalProps {
	open: boolean
	onCancel: () => void
	onSubmit: (item: ScheduleItem) => void
	initialValues?: Partial<ScheduleItem>
	speakersOptions: { label: string; value: string }[]
	isAdmin: boolean
	currentUser?: { label: string; value: string }
}

const ScheduleItemModal: React.FC<ScheduleItemModalProps> = ({
	open,
	onCancel,
	onSubmit,
	initialValues,
	speakersOptions,
	isAdmin,
	currentUser,
}) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()

	const handleOk = async () => {
		try {
			const values = await form.validateFields()
			onSubmit({
				...values,
				start: values.start.toISOString(),
				end: values.end.toISOString(),
			})
			form.resetFields()
		} catch {
			// Ошибки валидации
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
					start: initialValues?.start ? dayjs(initialValues.start) : undefined,
					end: initialValues?.end ? dayjs(initialValues.end) : undefined,
					speakers: isAdmin ? initialValues?.speakers : currentUser,
				}}
				requiredMark="optional"
			>
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
							options={speakersOptions}
							style={{ width: '100%' }}
							filterOption={false}
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
			</Form>
		</Modal>
	)
}

export default ScheduleItemModal
