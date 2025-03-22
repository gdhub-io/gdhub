import { useState, useEffect } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Form, Modal, Button, Slider, Typography, Space, InputNumber, Flex, message } from 'antd'
import axios from 'axios'
import styles from './styles.module.scss'

const { Text, Title } = Typography

interface EquityShareModalProps {
	open: boolean
	onOk: () => void
	onCancel: () => void
	projectEquity?: prismaClient.ProjectEquity
}

const EquityShareModal = ({ projectEquity, open, onOk, onCancel }: EquityShareModalProps) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const [equity, setEquity] = useState<prismaClient.ProjectEquity>()
	const [remainingPercentage, setRemainingPercentage] = useState<number>(0)

	useEffect(() => {
		setEquity(projectEquity)
	}, [projectEquity])

	// Mutation for saving equity distribution
	const { mutateAsync: saveEquity, isLoading: isSaving } = useMutation(
		(data: Partial<prismaClient.ProjectEquity>) => axios.put('/api/user/project/equity', data),
		{
			onSuccess: () => {
				onOk()
			},
		}
	)

	// Handler for changing mentor fund share
	const handleMentorFundChange = (value: number | null) => {
		// Minimum 2%
		const newValue = Math.max(2, value || 2)
		setEquity((prev) => {
			if (!prev) return prev
			return {
				...prev,
				mentorFundShare: newValue,
			}
		})
	}

	// Handler for changing investment reserve
	const handleInvestmentReserveChange = (value: number | null) => {
		setEquity((prev) => {
			if (!prev) return prev
			return {
				...prev,
				investmentReserve: value || 0,
			}
		})
	}

	// Handler for saving data
	const handleOk = async () => {
		try {
			if (!equity) {
				message.error(t('Equity distribution not found'))
				return
			}

			await saveEquity({
				id: equity.id,
				mentorFundShare: equity.mentorFundShare,
				investmentReserve: equity.investmentReserve,
			})
		} catch (error: any) {
			console.error(error)
		}
	}

	if (!projectEquity) {
		return null
	}

	return (
		<Modal
			title={t('Equity Settings')}
			open={open}
			maskClosable={false}
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

				{/* Settings for equity distribution */}
				<Form form={form} variant="filled" layout="vertical">
					{/* Mentor fund share (minimum 2%) */}
					<Form.Item name="mentorFundShare" label={t('Mentor Fund Share (minimum 2%)')}>
						<Flex align="center" gap={16}>
							<div className={styles.sliderContainer}>
								<Slider
									min={2}
									max={20}
									defaultValue={2}
									value={equity?.mentorFundShare ?? 2}
									onChange={handleMentorFundChange}
									marks={{ 2: '2%', 5: '5%', 10: '10%', 15: '15%', 20: '20%' }}
								/>
							</div>
							<InputNumber
								min={2}
								max={20}
								value={equity?.mentorFundShare ?? 2}
								onChange={handleMentorFundChange}
								addonAfter="%"
								style={{ width: '110px' }}
							/>
						</Flex>
					</Form.Item>

					{/* Investment reserve */}
					<Form.Item name="investmentReserve" label={t('Investment Reserve')}>
						<Flex align="center" gap={16}>
							<div className={styles.sliderContainer}>
								<Slider
									min={0}
									max={70}
									value={equity?.investmentReserve ?? 40}
									onChange={handleInvestmentReserveChange}
									marks={{ 0: '0%', 20: '20%', 40: '40%', 60: '60%' }}
								/>
							</div>
							<InputNumber
								min={0}
								max={70}
								value={equity?.investmentReserve ?? 40}
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
