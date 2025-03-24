import { useState, useEffect } from 'react'
import { HiOutlineTrash } from '@react-icons/all-files/hi/HiOutlineTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import {
	Modal,
	Form,
	InputNumber,
	Button,
	Slider,
	Typography,
	Space,
	Select,
	Flex,
	Checkbox,
	notification,
	Popconfirm,
} from 'antd'
import axios from 'axios'

const { Text, Paragraph } = Typography

interface MemberEquityPromiseModalProps {
	open: boolean
	onOk: (percentage: number, vested: boolean, targetStepId?: string) => void
	onCancel: () => void
	memberId: string
	memberName: string
	promiseId?: string
	maxShare: number
	projectId: string
	isVested?: boolean
	onDelete?: () => void
}

const MemberEquityPromiseModal = ({
	open,
	promiseId,
	onOk,
	onCancel,
	memberId,
	memberName,
	maxShare,
	projectId,
	isVested = true,
	onDelete,
}: MemberEquityPromiseModalProps) => {
	const { t } = useTolgee()
	const [form] = Form.useForm()
	const [percentage, setPercentage] = useState<number>(0)
	const [targetStepId, setTargetStepId] = useState<string | undefined>(undefined)
	const [deleteConfirmed, setDeleteConfirmed] = useState<boolean>(false)

	// Получаем информацию о текущем шаге проекта и все возможные шаги
	const { data: workflowData } = useQuery(
		['project-workflow', projectId, open],
		() => axios.get('/api/user/project/workflow', { params: { projectId } }),
		{
			enabled: !!projectId && open,
		}
	)

	const { data: promiseData } = useQuery(
		['project-promise', promiseId],
		() => axios.get('/api/user/project/equity/promise', { params: { promiseId } }),
		{
			enabled: !!promiseId,
			onSuccess: ({ data }) => {
				setPercentage(data.percentage)
				setTargetStepId(data.targetStepId)
				form.setFieldsValue({
					percentage: data.percentage,
					targetStepId: data.targetStepId,
				})
			},
		}
	)

	// Получаем доступные для выбора шаги (только следующие за текущим)
	const availableSteps = workflowData?.data?.steps
		? workflowData.data.steps
				.filter((step: any) => step.order > (workflowData.data.currentStep?.order || 0))
				.map((step: any) => ({
					label: step.name,
					value: step.id,
				}))
		: []

	// Сбрасываем значения при открытии модального окна
	useEffect(() => {
		if (open) {
			setPercentage(0)
			form.setFieldsValue({
				percentage: 0,
				targetStepId: undefined,
			})
		}
	}, [open, form])

	// Обработчик изменения значения слайдера или инпута
	const handlePercentageChange = (value: number | null) => {
		setPercentage(value || 0)
	}

	// Обработчик изменения целевого шага
	const handleTargetStepChange = (value: string) => {
		setTargetStepId(value)
	}

	// Mutation for creating a member share
	const { mutateAsync: createMemberShare, isLoading: isSaving } = useMutation(
		(data: { projectId: string; memberId: string; percentage: number; targetStepId?: string }) =>
			axios.post<any>('/api/user/project/equity/member', data),
		{
			onSuccess: () => {
				onOk(percentage, isVested, targetStepId)
			},
			onError: (error: any) => {
				console.error('Error while creating member share:', error)
			},
		}
	)

	// Mutation for updating a member share
	const { mutateAsync: updateMemberShare, isLoading: isUpdating } = useMutation(
		(data: { promiseId: string; percentage: number; targetStepId?: string }) =>
			axios.put<any>('/api/user/project/equity/member', data),
		{
			onSuccess: () => {
				onOk(percentage, isVested, targetStepId)
			},
			onError: (error: any) => {
				console.error('Error while updating member share:', error)
			},
		}
	)

	// Mutation for deleting a member share
	const { mutateAsync: deleteMemberShare, isLoading: isDeleting } = useMutation(
		() => axios.delete<any>('/api/user/project/equity/member', { params: { promiseId } }),
		{
			onSuccess: () => {
				if (onDelete) onDelete()
				onCancel()
			},
			onError: (error: any) => {
				console.error('Error while deleting member share:', error)
			},
		}
	)

	// Обработчик сохранения
	const handleOk = async () => {
		try {
			await form.validateFields()

			if (promiseId) {
				await updateMemberShare({
					promiseId,
					percentage,
					targetStepId,
				})
			} else {
				await createMemberShare({
					projectId,
					memberId,
					percentage,
					targetStepId,
				})
			}
		} catch (error) {
			console.error('Validation failed:', error)
		}
	}

	// Обработчик удаления
	const handleDelete = async () => {
		if (!deleteConfirmed) {
			notification.error({
				message: t(
					'equityPromise.delete.confirm.error',
					'You should confirm that the member has been informed about the deletion'
				),
			})
			return
		}

		try {
			await deleteMemberShare()
			onCancel()
		} catch (error) {
			console.error('Error during deletion:', error)
		}
	}

	const handleDeleteConfirmChange = (e: any) => {
		setDeleteConfirmed(e.target.checked)
	}

	return (
		<Modal
			title={
				promiseId
					? t('modal.memberEquityPromise.update.title', 'Update Promise for {memberName}', { memberName })
					: t('modal.memberEquityPromise.create.title', 'New Promise for {memberName}', { memberName })
			}
			open={open}
			width={600}
			onCancel={onCancel}
			footer={
				<Flex style={{ width: '100%' }} justify="space-between">
					<div>
						{promiseId && (
							<Popconfirm
								key="delete"
								title={t('modal.memberEquityPromise.delete.title', 'Delete equity promise')}
								description={
									<div>
										<Paragraph>
											{t(
												'modal.memberEquityPromise.delete.description',
												'Are you sure you want to delete this equity promise?'
											)}
										</Paragraph>
										<Checkbox onChange={handleDeleteConfirmChange}>
											{t(
												'equityPromise.delete.confirm',
												'I confirm that I have discussed the removal of this equity promise with the member.'
											)}
										</Checkbox>
									</div>
								}
								onConfirm={handleDelete}
								okText={t('Delete')}
								cancelText={t('Cancel')}
								okButtonProps={{ danger: true, loading: isDeleting }}
							>
								<Button key="delete" icon={<HiOutlineTrash />} danger type="text" />
							</Popconfirm>
						)}
					</div>
					<Space>
						<Button key="cancel" onClick={onCancel}>
							{t('Cancel')}
						</Button>
						<Button key="submit" type="primary" onClick={handleOk} loading={isSaving || isUpdating}>
							{t('Save')}
						</Button>
					</Space>
				</Flex>
			}
		>
			<Space direction="vertical" style={{ width: '100%' }} size="large">
				<Paragraph type="secondary">
					{t('Promised shares will be automatically vested when the project reaches the specified workflow step.')}
				</Paragraph>

				<Form form={form} variant="filled" layout="vertical">
					<Form.Item label={t('Share Percentage')} name="percentage" initialValue={0}>
						<Flex align="center" gap={16}>
							<div style={{ flex: 1 }}>
								<Slider
									min={0}
									max={maxShare}
									step={0.1}
									value={percentage}
									marks={Object.fromEntries([
										...[...Array(Math.floor(maxShare / 10))].map((_, i) => [i * 10, `${i * 10}%`]),
										[maxShare, `${maxShare}%`],
									])}
									onChange={handlePercentageChange}
								/>
							</div>
							<InputNumber
								min={0}
								max={maxShare}
								step={0.1}
								value={percentage}
								onChange={handlePercentageChange}
								addonAfter="%"
								style={{ width: '110px' }}
							/>
						</Flex>
					</Form.Item>

					<Form.Item name="targetStepId" label={t('Vesting at Workflow Step')}>
						<Select
							placeholder={t('Select the step for vesting')}
							onChange={handleTargetStepChange}
							allowClear
							options={availableSteps}
						/>
					</Form.Item>

					<Form.Item
						name="confirmEquityTerms"
						valuePropName="checked"
						noStyle
						rules={[
							{
								validator: (_, value) => {
									if (!value) {
										notification.error({
											message: t(
												'equityPromise.confirm.error',
												'You should confirm the accuracy of the information entered'
											),
										})
									}
									return value ? Promise.resolve() : Promise.reject()
								},
							},
						]}
					>
						<Checkbox>
							{t(
								'equityPromise.confirm',
								'I confirm that I have discussed the equity terms with the member, and they have agreed to these conditions.'
							)}
						</Checkbox>
					</Form.Item>
				</Form>
			</Space>
		</Modal>
	)
}

export default MemberEquityPromiseModal
