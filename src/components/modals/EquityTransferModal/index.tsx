import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Modal, Form, InputNumber, Select, Input, Button, Typography, Divider, Space, Avatar } from 'antd'
import axios from 'axios'
import styles from './styles.module.scss'

const { Text, Title } = Typography
const { Option } = Select

interface EquityTransferModalProps {
	open: boolean
	onCancel: () => void
	projectId: string
	currentUserId: string
	teamMembers: any[] // Предполагается, что это массив участников команды
}

interface TransferFormData {
	toUserId: string
	percentage: number
	reason?: string
}

const EquityTransferModal = ({ open, onCancel, projectId, currentUserId, teamMembers }: EquityTransferModalProps) => {
	const { t } = useTolgee()
	const [form] = Form.useForm<TransferFormData>()
	const queryClient = useQueryClient()
	const [currentEquity, setCurrentEquity] = useState<number>(0)

	// Получаем данные о долях текущего проекта
	const { data: equityData, isLoading: isLoadingEquity } = useQuery(
		['project-equity', projectId],
		async () => {
			const response = await axios.get('/api/user/project/equity', {
				params: { projectId },
			})
			return response.data
		},
		{
			enabled: open && !!projectId,
			onSuccess: (data) => {
				// Находим долю текущего пользователя
				const currentUserShare = data.equityAllocations?.find((allocation: any) => allocation.ownerId === currentUserId)
				setCurrentEquity(currentUserShare?.percentage || 0)
			},
		}
	)

	// Мутация для передачи доли
	const { mutate: transferEquity, isLoading: isTransferring } = useMutation(
		(data: TransferFormData) =>
			axios.post('/api/user/project/equity/transaction/transfer', {
				projectId,
				toUserId: data.toUserId,
				percentage: data.percentage,
				reason: data.reason,
			}),
		{
			onSuccess: () => {
				// Инвалидируем запросы на получение долей и транзакций
				queryClient.invalidateQueries(['project-equity', projectId])
				queryClient.invalidateQueries(['equity-transactions', projectId])
				onCancel()
				form.resetFields()
			},
		}
	)

	// Сбрасываем форму при открытии модального окна
	useEffect(() => {
		if (open) {
			form.resetFields()
		}
	}, [open, form])

	// Обработчик отправки формы
	const handleOk = async () => {
		try {
			const values = await form.validateFields()
			transferEquity(values)
		} catch (error) {
			console.error('Validation failed:', error)
		}
	}

	// Проверка доступной доли
	const validatePercentage = (_: any, value: number) => {
		if (value <= 0) {
			return Promise.reject(new Error(t('Доля должна быть больше 0')))
		}
		if (value > currentEquity) {
			return Promise.reject(new Error(t('Недостаточно долей для передачи')))
		}
		return Promise.resolve()
	}

	// Получаем список участников команды без текущего пользователя
	const filteredTeamMembers = teamMembers.filter(
		(member) => member.userId !== currentUserId && member.status === 'Active'
	)

	return (
		<Modal title={t('Передача доли участнику')} open={open} onCancel={onCancel} footer={null} width={500}>
			<div className={styles.container}>
				<Space direction="vertical" style={{ width: '100%' }} size="large">
					<div className={styles.infoBox}>
						<Title level={5}>{t('Ваша текущая доля в проекте')}</Title>
						<Text strong>{currentEquity.toFixed(2)}%</Text>
						<Divider />
						<Text type="secondary">
							{t(
								'Передавая долю другому участнику, вы соглашаетесь передать часть своих прав в проекте. Это действие нельзя отменить.'
							)}
						</Text>
					</div>

					<Form form={form} layout="vertical" requiredMark={false} className={styles.form}>
						<Form.Item
							name="toUserId"
							label={t('Получатель доли')}
							rules={[{ required: true, message: t('Выберите получателя') }]}
						>
							<Select placeholder={t('Выберите участника')}>
								{filteredTeamMembers.map((member) => (
									<Option key={member.userId} value={member.userId}>
										<div className={styles.memberOption}>
											<Avatar size="small" src={member.user?.image} icon={!member.user?.image} />
											<span>{member.user?.name || member.user?.email || t('Участник')}</span>
										</div>
									</Option>
								))}
							</Select>
						</Form.Item>

						<Form.Item
							name="percentage"
							label={t('Доля для передачи (%)')}
							rules={[{ required: true, message: t('Укажите долю для передачи') }, { validator: validatePercentage }]}
						>
							<InputNumber
								min={0.01}
								max={currentEquity}
								step={0.1}
								precision={2}
								style={{ width: '100%' }}
								addonAfter="%"
							/>
						</Form.Item>

						<Form.Item name="reason" label={t('Причина передачи (необязательно)')}>
							<Input.TextArea rows={3} placeholder={t('Укажите причину передачи доли')} />
						</Form.Item>
					</Form>

					<div className={styles.actions}>
						<Button onClick={onCancel}>{t('Отмена')}</Button>
						<Button type="primary" loading={isTransferring} onClick={handleOk} disabled={currentEquity <= 0}>
							{t('Передать долю')}
						</Button>
					</div>
				</Space>
			</div>
		</Modal>
	)
}

export default EquityTransferModal
