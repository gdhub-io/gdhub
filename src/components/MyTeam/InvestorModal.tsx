import { useState } from 'react'
import { T } from '@tolgee/react'
import { Modal, Form, Input, InputNumber, Slider, Checkbox, Row, Col, Typography, DatePicker } from 'antd'
import dayjs from 'dayjs'

const { Paragraph } = Typography

interface AddInvestorModalProps {
	open: boolean
	onOk: (values: any) => void
	onCancel: () => void
	investmentReserve: number
	investors: { share: number }[]
}

const InvestorModal = ({ open, onOk, onCancel, investmentReserve, investors }: AddInvestorModalProps) => {
	const [form] = Form.useForm()
	const [confirm, setConfirm] = useState(false)

	const usedShare = investors.reduce((sum, inv) => sum + (inv.share || 0), 0)
	const maxShare = Math.max(0.1, Number((investmentReserve - usedShare).toFixed(2)))

	// Генерируем marks для слайдера: 0.1, 1/4, 1/2, 3/4, maxShare
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

	// Синхронизация значения между Slider и InputNumber
	const shareValue = Form.useWatch('share', form)
	const handleShareChange = (value: number | null) => {
		form.setFieldsValue({ share: value ?? 0.1 })
	}

	const handleOk = async () => {
		try {
			const values = await form.validateFields()
			if (!confirm) return
			onOk(values)
			form.resetFields()
			setConfirm(false)
		} catch (e) {}
	}

	const handleCancel = () => {
		form.resetFields()
		setConfirm(false)
		onCancel()
	}

	return (
		<Modal
			open={open}
			title={<T>Add investor</T>}
			onOk={handleOk}
			onCancel={handleCancel}
			okButtonProps={{ disabled: !confirm }}
			destroyOnClose
			maskClosable={false}
		>
			<Paragraph type="secondary">
				<T>
					Form for adding information about investors who have invested in your project financially (bought a share)
				</T>
			</Paragraph>
			<Form form={form} layout="vertical" requiredMark={false} variant="filled">
				<Form.Item
					name="name"
					label={<T>Investor name</T>}
					rules={[{ required: true, message: 'Please enter investor name' }]}
				>
					<Input placeholder="Investor name or company" style={{ height: 40 }} />
				</Form.Item>
				<Form.Item name="share" label={<T>Share (%)</T>} rules={[{ required: true, message: 'Please specify share' }]}>
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
							label={<T>Share price paid, USD</T>}
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
					name="dealDate"
					label={<T>Deal date</T>}
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
						<T>I confirm that the share sale has already been completed between the author and the investor</T>
					</Checkbox>
				</Form.Item>
			</Form>
		</Modal>
	)
}

export default InvestorModal
