import { useState, useEffect } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Form, Modal, Button, Slider, Typography, Space, InputNumber, Flex } from 'antd'
import axios from 'axios'
import styles from './styles.module.scss'

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

interface EquityAllocation {
	id?: string
	ownerId: string
	teamMemberId?: string | null
	percentage: number
	isFixed: boolean
	vested: boolean
	promises?: EquityPromise[]
}

interface EquityPromise {
	id?: string
	percentage: number
	targetStepId?: string | null
	description?: string
	isExecuted: boolean
}

interface ProjectEquity {
	platformShare: number // Фиксированные 3%
	mentorFundShare: number // Минимум 7%
	investmentReserve: number // Резерв под инвестиции, например 40%
	teamShares?: any[] // Для обратной совместимости
	equityAllocations?: EquityAllocation[] // Новый формат для хранения долей
}

const defaultEquity: ProjectEquity = {
	platformShare: 3, // Фиксированные 3%
	mentorFundShare: 7, // Минимум 7%
	investmentReserve: 40, // Резерв под инвестиции, по умолчанию 40%
	equityAllocations: [],
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
		// Вычисляем общую долю команды, используя equityAllocations если доступны,
		// иначе используем teamShares для обратной совместимости
		const teamTotal = equity.equityAllocations
			? equity.equityAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0)
			: 0

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
			title={t('Equity Settings')}
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
			<Space direction="vertical" style={{ width: '100%', paddingInline: 8 }} size="large">
				<div className={styles.equityRules}>
					<Title level={5}>{t('Equity Distribution Rules')}</Title>
					<ul>
						<li>{t('3% is fixed for the platform')}</li>
						<li>{t('At least 7% is allocated to the mentor fund')}</li>
						<li>{t('A portion should be reserved for future investments')}</li>
					</ul>
				</div>

				{/* Сводка распределения долей */}
				<div className={styles.equitySummary}>
					<Text>
						{t('Remaining unallocated percentage')}
						{': '}
						<Text strong type={remainingPercentage < 0 ? 'danger' : undefined}>
							{remainingPercentage.toFixed(1)}%
						</Text>
					</Text>
					<Text>
						{t('Team allocated percentage')}
						{': '}
						<Text strong>
							{100 - equity.platformShare - equity.mentorFundShare - equity.investmentReserve - remainingPercentage}%
						</Text>
					</Text>
				</div>

				{/* Настройка долей */}
				<Form form={form} variant="filled" layout="vertical">
					{/* Доля фонда менторов (минимум 7%) */}
					<Form.Item label={t('Mentor Fund Share (minimum 7%)')}>
						<Flex align="center" gap={16}>
							<div className={styles.sliderContainer}>
								<Slider
									min={7}
									max={20}
									defaultValue={7}
									value={equity.mentorFundShare}
									onChange={handleMentorFundChange}
									marks={{ 7: '7%', 10: '10%', 15: '15%', 20: '20%' }}
								/>
							</div>
							<InputNumber
								min={7}
								max={20}
								value={equity.mentorFundShare}
								onChange={handleMentorFundChange}
								addonAfter="%"
								style={{ width: '110px' }}
							/>
						</Flex>
					</Form.Item>

					{/* Резерв под инвестиции */}
					<Form.Item label={t('Investment Reserve')}>
						<Flex align="center" gap={16}>
							<div className={styles.sliderContainer}>
								<Slider
									min={0}
									max={70}
									value={equity.investmentReserve}
									onChange={handleInvestmentReserveChange}
									marks={{ 0: '0%', 20: '20%', 40: '40%', 60: '60%' }}
								/>
							</div>
							<InputNumber
								min={0}
								max={70}
								value={equity.investmentReserve}
								onChange={handleInvestmentReserveChange}
								addonAfter="%"
								style={{ width: '110px' }}
							/>
						</Flex>
					</Form.Item>
				</Form>
			</Space>
		</Modal>
	)
}

export default EquityShareModal
