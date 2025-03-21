import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Modal, Form, InputNumber, Button, Slider, Typography, Space, Select, Flex } from 'antd'
import axios from 'axios'

const { Text, Paragraph } = Typography

interface MemberShareModalProps {
	open: boolean
	onOk: (percentage: number, vested: boolean, targetStepId?: string) => void
	onCancel: () => void
	memberId: string
	currentShare: number
	maxShare: number
	projectId: string
	isVested?: boolean
}

const MemberShareModal = ({
	open,
	onOk,
	onCancel,
	memberId,
	currentShare,
	maxShare,
	projectId,
	isVested = true,
}: MemberShareModalProps) => {
	const { t } = useTolgee()
	const [form] = Form.useForm()
	const [percentage, setPercentage] = useState<number>(currentShare)
	const [targetStepId, setTargetStepId] = useState<string | undefined>(undefined)

	// Получаем информацию о текущем шаге проекта и все возможные шаги
	const { data: workflowData } = useQuery(
		['project-workflow', projectId, open],
		() => axios.get('/api/user/project/workflow', { params: { projectId } }),
		{
			enabled: !!projectId && open,
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
			setPercentage(currentShare)
			form.setFieldsValue({
				percentage: currentShare,
				targetStepId: undefined,
			})
		}
	}, [open, currentShare, form])

	// Обработчик изменения значения слайдера или инпута
	const handlePercentageChange = (value: number | null) => {
		setPercentage(value || 0)
	}

	// Обработчик изменения целевого шага
	const handleTargetStepChange = (value: string) => {
		setTargetStepId(value)
	}

	// Мутация для сохранения доли участника
	const { mutateAsync: saveMemberShare, isLoading: isSaving } = useMutation(
		(data: { projectId: string; memberId: string; percentage: number; targetStepId?: string }) =>
			axios.post<any>('/api/user/project/equity/member', data),
		{
			onSuccess: () => {
				onOk(percentage, isVested, targetStepId)
			},
			onError: (error: any) => {
				console.error('Ошибка при сохранении доли участника:', error)
			},
		}
	)

	// Обработчик сохранения
	const handleOk = async () => {
		try {
			await form.validateFields()
			await saveMemberShare({
				projectId,
				memberId,
				percentage,
				targetStepId,
			})
		} catch (error) {
			console.error('Validation failed:', error)
		}
	}

	return (
		<Modal
			title={t('Edit Member Share')}
			open={open}
			width={600}
			onCancel={onCancel}
			footer={[
				<Button key="cancel" onClick={onCancel}>
					{t('Cancel')}
				</Button>,
				<Button key="submit" type="primary" onClick={handleOk} loading={isSaving}>
					{t('Save')}
				</Button>,
			]}
		>
			<Space direction="vertical" style={{ width: '100%' }} size="large">
				<Paragraph type="secondary">
					{t('Promised shares will be automatically vested when the project reaches the specified workflow step.')}
				</Paragraph>

				<Form form={form} variant="filled" layout="vertical">
					<Form.Item
						label={t('Share Percentage')}
						name="percentage"
						rules={[
							{
								required: true,
								message: t('Please input the share percentage'),
							},
							{
								type: 'number',
								min: 0,
								max: maxShare,
								message: t('Share percentage must be between 0 and') + ' ' + maxShare.toFixed(1) + '%',
							},
						]}
						initialValue={currentShare}
					>
						<Flex align="center" gap={16}>
							<div style={{ flex: 1 }}>
								<Slider min={0} max={maxShare} step={0.1} value={percentage} onChange={handlePercentageChange} />
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

					<Form.Item
						label={t('Vesting at Workflow Step')}
						name="targetStepId"
						tooltip={t('Shares will be automatically vested when the project reaches this step')}
					>
						<Select
							placeholder={t('Select the step for vesting')}
							onChange={handleTargetStepChange}
							allowClear
							options={availableSteps}
						/>
					</Form.Item>
				</Form>
			</Space>
		</Modal>
	)
}

export default MemberShareModal
