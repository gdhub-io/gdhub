import { useState, useEffect } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Form, Modal, Button, Slider, Typography, Space, InputNumber, Alert } from 'antd'
import axios from 'axios'

const { Text, Title } = Typography

interface EquityShareModalProps {
	teamId: string
	open: boolean
	onOk: () => void
	onCancel: () => void
	projectId: string
	teamMembers: (prismaClient.TeamMember & { user: prismaClient.User })[]
	projectWorkflow?: any // Тип для workflow с шагами
}

interface EquityShare {
	memberId: string
	percentage: number
	targetStepId?: string | null
	isFixed: boolean
}

interface ProjectEquity {
	platformShare: number // Фиксированные 3%
	mentorFundShare: number // Минимум 7%
	investmentReserve: number // Резерв под инвестиции, например 40%
	teamShares: EquityShare[]
}

const defaultEquity: ProjectEquity = {
	platformShare: 3, // Фиксированные 3%
	mentorFundShare: 7, // Минимум 7%
	investmentReserve: 40, // Резерв под инвестиции, по умолчанию 40%
	teamShares: [],
}

const EquityShareModal = ({ teamId, projectId, open, onOk, onCancel, teamMembers }: EquityShareModalProps) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [equity, setEquity] = useState<ProjectEquity>(defaultEquity)
	const [remainingPercentage, setRemainingPercentage] = useState<number>(0)

	// Получаем текущие доли проекта
	const {
		data: equityData,
		refetch: fetchEquity,
		isLoading: isLoadingEquity,
	} = useQuery(
		['project-equity', projectId],
		() =>
			axios.get<ProjectEquity>('/api/user/project/equity', {
				params: { projectId },
			}),
		{
			enabled: !!projectId && open,
			onSuccess: (data) => {
				setEquity(data.data || defaultEquity)
			},
		}
	)

	// Мутация для сохранения распределения долей
	const { mutateAsync: saveEquity, isLoading: isSaving } = useMutation(
		(data: ProjectEquity) => axios.post('/api/user/project/equity', { projectId, ...data }),
		{
			onSuccess: () => {
				fetchEquity()
				onOk()
			},
		}
	)

	// Пересчитываем оставшийся процент при изменении долей
	useEffect(() => {
		const teamTotal = equity.teamShares.reduce((sum, share) => sum + share.percentage, 0)
		const allocatedPercentage = equity.platformShare + equity.mentorFundShare + equity.investmentReserve + teamTotal
		setRemainingPercentage(100 - allocatedPercentage)
	}, [equity])

	// Обработчик изменения доли ментор-фонда
	const handleMentorFundChange = (value: number | null) => {
		// Минимум 7%
		const newValue = Math.max(7, value || 7)
		setEquity((prev) => ({
			...prev,
			mentorFundShare: newValue,
		}))
	}

	// Обработчик изменения резерва под инвестиции
	const handleInvestmentReserveChange = (value: number | null) => {
		setEquity((prev) => ({
			...prev,
			investmentReserve: value || 0,
		}))
	}

	// Обработчик для сохранения данных
	const handleOk = async () => {
		try {
			await saveEquity(equity)
		} catch (error: any) {
			console.error(error)
		}
	}

	return (
		<Modal
			title={t('Global Project Settings')}
			open={open}
			width={600}
			onCancel={onCancel}
			footer={[
				<Button key="cancel" onClick={onCancel}>
					{t('Cancel')}
				</Button>,
				<Button key="submit" type="primary" loading={isSaving} onClick={handleOk} disabled={remainingPercentage < 0}>
					{t('Save')}
				</Button>,
			]}
		>
			<Space direction="vertical" style={{ width: '100%' }} size="large">
				<Alert
					message={t('Equity Distribution Rules')}
					description={
						<ul>
							<li>{t('3% is fixed for the platform')}</li>
							<li>{t('At least 7% is allocated to the mentor fund')}</li>
							<li>{t('A portion should be reserved for future investments')}</li>
							<li>
								{t('The remaining percentage ({remainingPercent}%) is available for team distribution', {
									remainingPercent: remainingPercentage.toFixed(2),
								})}
							</li>
						</ul>
					}
					type="info"
					showIcon
				/>

				{/* Настройка долей */}
				<Form form={form} layout="vertical">
					<Title level={4}>{t('Global Settings')}</Title>

					{/* Доля фонда менторов (минимум 7%) */}
					<Form.Item label={t('Mentor Fund Share (minimum 7%)')}>
						<Slider
							min={7}
							max={20}
							value={equity.mentorFundShare}
							onChange={handleMentorFundChange}
							marks={{ 7: '7%', 10: '10%', 15: '15%', 20: '20%' }}
						/>
						<InputNumber
							min={7}
							max={20}
							value={equity.mentorFundShare}
							onChange={handleMentorFundChange}
							addonAfter="%"
							style={{ width: '100px' }}
						/>
					</Form.Item>

					{/* Резерв под инвестиции */}
					<Form.Item label={t('Investment Reserve')}>
						<Slider
							min={0}
							max={70}
							value={equity.investmentReserve}
							onChange={handleInvestmentReserveChange}
							marks={{ 0: '0%', 20: '20%', 40: '40%', 60: '60%' }}
						/>
						<InputNumber
							min={0}
							max={70}
							value={equity.investmentReserve}
							onChange={handleInvestmentReserveChange}
							addonAfter="%"
							style={{ width: '100px' }}
						/>
					</Form.Item>
				</Form>
			</Space>
		</Modal>
	)
}

export default EquityShareModal
