import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Modal, Form, Input, InputNumber, Slider, Checkbox, Row, Col, Typography, DatePicker, message } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'

const { Paragraph } = Typography

interface AddInvestorModalProps {
	open: boolean
	onOk: (values: any) => void
	onCancel: () => void
	investmentReserve: number
	investors: { share: number }[]
	teamInvestorId?: string
	teamId: string
}

const InvestorModal = ({
	teamInvestorId,
	open,
	onOk,
	onCancel,
	investmentReserve,
	investors,
	teamId,
}: AddInvestorModalProps) => {
	const { t } = useTranslate()
	const [form] = Form.useForm()
	const [confirm, setConfirm] = useState(false)

	const { data, isLoading } = useQuery({
		queryKey: ['teamInvestor', teamInvestorId],
		queryFn: () => axios.get(`/api/project/team-investor/${teamInvestorId}`),
		enabled: !!teamInvestorId,
	})

	const { mutateAsync: createTeamInvestor } = useMutation({
		mutationFn: (values: any) => axios.post('/api/project/team-investor', values),
	})

	const { mutateAsync: updateTeamInvestor } = useMutation({
		mutationFn: ({ id, values }: { id: string; values: any }) => axios.put(`/api/project/team-investor/${id}`, values),
	})

	useEffect(() => {
		if (data) {
			form.setFieldsValue({
				name: data.data.name,
				share: data.data.share,
				currency: data.data.currency,
				value: data.data.value,
				purchasedAt: dayjs(data.data.purchasedAt),
			})
		}
	}, [open, data])

	const usedShare = useMemo(() => investors.reduce((sum, inv) => sum + (inv.share || 0), 0), [investors])
	const maxShare = useMemo(
		() => Math.max(0.1, Number((investmentReserve - usedShare).toFixed(2))) + (data?.data.share || 0),
		[investmentReserve, usedShare, data?.data.share]
	)

	const getSliderMarks = () => {
		if (maxShare <= 0.1) return { 0.1: '0.1', [maxShare]: maxShare.toString() }
		const step = (maxShare - 0.1) / 4
		const marks: Record<number, string> = {}
		marks[0.1] = '0.1'
		for (let i = 1; i <= 3; i++) {
			const raw = 0.1 + step * i
			const rounded = Math.round(raw / 5) * 5
			marks[rounded] = rounded.toString()
		}
		marks[maxShare] = maxShare.toString()
		return marks
	}

	const shareValue = Form.useWatch('share', form)
	const handleShareChange = (value: number | null) => {
		form.setFieldsValue({ share: value ?? 0.1 })
	}

	const handleOk = async () => {
		try {
			const values = await form.validateFields()

			if (teamInvestorId) {
				await updateTeamInvestor({
					id: teamInvestorId,
					values,
				})
			} else {
				await createTeamInvestor({
					...values,
					teamId,
				})
			}

			onOk(values)
			form.resetFields()
			setConfirm(false)
		} catch (e) {
			message.error('Failed to save investor')
		}
	}

	const handleCancel = () => {
		form.resetFields()
		setConfirm(false)
		onCancel()
	}

	return (
		<Modal
			centered
			open={open}
			title={teamInvestorId ? t('Edit investor') : t('Add investor')}
			onOk={handleOk}
			onCancel={handleCancel}
			okButtonProps={{ disabled: !confirm }}
			destroyOnHidden
			maskClosable={false}
		>
			<Paragraph type="secondary">
				{t(
					'modal.investor.formDescription',
					'Form for adding information about investors who have invested in your project financially (bought a share)'
				)}
			</Paragraph>
			<Form form={form} layout="vertical" requiredMark={false} variant="filled">
				<Form.Item
					name="name"
					label={t('modal.investor.investorName', 'Investor name')}
					rules={[{ required: true, message: 'Please enter investor name' }]}
				>
					<Input placeholder="Investor name or company" style={{ height: 40 }} />
				</Form.Item>
				<Form.Item
					name="share"
					label={t('modal.investor.share', 'Share (%)')}
					rules={[{ required: true, message: 'Please specify share' }]}
				>
					<Row gutter={8} align="middle" style={{ alignItems: 'center' }}>
						<Col flex="auto">
							<Slider
								min={0.1}
								max={maxShare}
								step={0.1}
								marks={getSliderMarks()}
								style={{ height: 40, marginBottom: 0 }}
								value={typeof shareValue === 'number' ? shareValue : 0.1}
								onChange={handleShareChange}
							/>
						</Col>
						<Col flex="80px" style={{ display: 'flex', alignItems: 'center' }}>
							<InputNumber
								min={0.1}
								max={maxShare}
								step={0.1}
								style={{ width: '100%', height: 40 }}
								value={typeof shareValue === 'number' ? shareValue : 0.1}
								onChange={handleShareChange}
								precision={2}
							/>
						</Col>
					</Row>
				</Form.Item>
				<Row gutter={8}>
					<Col span={24}>
						<Form.Item
							name="value"
							label={t('modal.investor.sharePricePaid', 'Share price paid, USD')}
							rules={[
								{ required: true, message: 'Please specify amount' },
								{ type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
							]}
						>
							<InputNumber
								min={0.01}
								style={{ width: '100%', height: 40 }}
								placeholder="Amount paid by investor in USD"
							/>
						</Form.Item>
					</Col>
				</Row>
				<Form.Item
					name="purchasedAt"
					label={t('modal.investor.dealDate', 'Deal date')}
					rules={[{ required: true, message: 'Please select deal date' }]}
				>
					<DatePicker
						style={{ width: '100%', height: 40 }}
						format="DD.MM.YYYY"
						disabledDate={(current) => current && current > dayjs().endOf('day')}
						placeholder="Select deal date"
					/>
				</Form.Item>
				<Form.Item>
					<Checkbox checked={confirm} onChange={(e) => setConfirm(e.target.checked)}>
						{teamInvestorId
							? t(
									'modal.confirm.editInvestor',
									'I confirm that the change in the share sale has already been confirmed between the author and the investor'
								)
							: t(
									'modal.confirm.investor',
									'I confirm that the share sale has already been completed between the author and the investor'
								)}
					</Checkbox>
				</Form.Item>
			</Form>
		</Modal>
	)
}

export default InvestorModal
