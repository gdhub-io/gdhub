import { useState } from 'react'
import { gtmEventTrigger } from '@/helpers/gtm'
import { useWorkDirections } from '@/hooks/library'
import { useMutation } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Form, Input, message, Modal, Select, DatePicker } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'

interface InviteMemberModalProps {
	teamId: string
	open: boolean
	onOk: () => void
	onCancel: () => void
}

const InviteMemberModal = ({ teamId, open, onOk, onCancel }: InviteMemberModalProps) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const { options: directionsOptions } = useWorkDirections()
	const [isEmailValid, setIsEmailValid] = useState(true)

	const { mutateAsync: inviteMember, isPending: isInviting } = useMutation({
		mutationFn: (data: Record<string, any>) => axios.post<any>('/api/user/project/team/invite', data),
		onSuccess: () => {
			message.success(t('Invitation sent successfully'))
			form.resetFields()
			onOk()
		},
		onError: (error: any) => {
			console.error(error)
			message.error(error.response?.data?.message || error.message || t('Failed to send invitation'))
		},
	})

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()

			await inviteMember({
				teamId,
				email: formData.email,
				position: formData.position,
				directionId: formData.directionId,
				startedAt: formData.startedAt ? formData.startedAt.toISOString() : new Date().toISOString(),
			})
			gtmEventTrigger('team_invite', {
				teamId,
				position: formData.position,
				direction: directionsOptions?.find((direction) => direction.value === formData.directionId)?.label,
			})
		} catch (error) {
			console.error('Validation failed:', error)
		}
	}

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	const validateEmail = (email: string) => {
		const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
		setIsEmailValid(isValid)
		return isValid
	}

	return (
		<Modal
			title={<T>Invite Team Member</T>}
			open={open}
			onCancel={handleCancel}
			footer={[
				<Button key="cancel" onClick={handleCancel} type="text">
					<T>Cancel</T>
				</Button>,
				<Button key="submit" type="primary" loading={isInviting} onClick={handleOk} disabled={!isEmailValid}>
					<T>Send Invitation</T>
				</Button>,
			]}
		>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				initialValues={{ position: '', email: '', directionId: undefined, startedAt: dayjs() }}
			>
				<Form.Item
					name="email"
					label={<T>Email</T>}
					rules={[
						{ required: true, message: t('Please enter email') },
						{
							validator: (_, value) =>
								validateEmail(value) ? Promise.resolve() : Promise.reject(new Error(t('Please enter a valid email'))),
						},
					]}
				>
					<Input placeholder={t('Enter email address')} />
				</Form.Item>

				<Form.Item
					name="position"
					label={<T>Position</T>}
					rules={[{ required: true, message: t('Please enter position') }]}
				>
					<Input placeholder={t('Enter position')} />
				</Form.Item>

				<Form.Item
					name="directionId"
					label={<T>Work Direction</T>}
					rules={[{ required: true, message: t('Please select work direction') }]}
				>
					<Select placeholder={t('Select work direction')} options={directionsOptions} />
				</Form.Item>

				<Form.Item
					name="startedAt"
					label={<T>Start Date</T>}
					rules={[{ required: true, message: t('Please select start date') }]}
				>
					<DatePicker format="DD.MM.YYYY" placeholder={t('Select start date')} style={{ width: '100%' }} />
				</Form.Item>
			</Form>
		</Modal>
	)
}

export default InviteMemberModal
