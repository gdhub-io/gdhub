import { useEffect, useMemo, useState } from 'react'
import { AutoComplete, Button, Card, Col, Form, Input, message, Row, Slider, Spin } from 'antd'
import { useSession } from 'next-auth/react'
import countryList from 'react-select-country-list'

const ResourcesProfileForm = ({ profile }: any) => {
	const [form] = Form.useForm()
	const { data: session } = useSession()
	const [processing, setProcessing] = useState(true)
	const countries = useMemo(() => countryList().getData(), [])
	const [avaibleHours, setAvaibleHours] = useState({ min: 2, max: 4 })

	useEffect(() => {
		if (profile) {
			setProcessing(false)

			if (profile['Time For Work']) {
				setAvaibleHours({ min: profile['Time For Work'][0], max: profile['Time For Work'][1] })
			}
		}
	}, [profile])

	const handleForm = async () => {
		try {
			const formData = await form.validateFields()
			const timeForWork = formData['Time For Work']

			setProcessing(true)

			console.log(formData)

			const response: any = await fetch('/api/profile/update', {
				method: 'post',
				body: JSON.stringify({ id: profile.id, data: { 'Time For Work': `${timeForWork[0]}-${timeForWork[1]}` } }),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			setProcessing(false)

			if (response.error) {
				throw new Error(response.error.message)
			}

			message.success('Данные о ресурсах обновлены')
		} catch (error: any) {
			setProcessing(false)
			message.error(error.message)
		}
	}

	const avaibleHoursText = () => {
		if (avaibleHours.min !== avaibleHours.max) {
			return `от ${avaibleHours.min} до ${avaibleHours.max} часов в неделю`
		} else {
			return `${avaibleHours.min} часов в неделю`
		}
	}

	return (
		<Card title="Ресурсы">
			<Spin spinning={processing}>
				<Form
					form={form}
					layout="vertical"
					name="profile-resources-form"
					wrapperCol={{ span: 12 }}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						'Time For Work': profile['Time For Work'],
					}}
				>
					<Form.Item
						label="Доступное время"
						extra="Сколько часов в неделю вы можете уделять участию в проектах."
						wrapperCol={{ span: 24 }}
						required
						valuePropName="value"
					>
						<Row>
							<Col md={{ span: 12 }} xs={{ span: 24 }}>
								<Form.Item name="Time For Work" noStyle>
									<Slider
										range
										defaultValue={[avaibleHours.min, avaibleHours.max]}
										max={56}
										min={1}
										marks={{ 1: '1 час', 56: '56 часов' }}
										onChange={([min, max]) => setAvaibleHours({ min, max })}
									/>
								</Form.Item>
							</Col>
							<Col md={{ span: 6, offset: 2 }} xs={{ span: 24 }}>
								{avaibleHoursText()}
							</Col>
						</Row>
					</Form.Item>

					<Button type="primary" onClick={handleForm}>
						Сохранить
					</Button>
				</Form>
			</Spin>
		</Card>
	)
}

export default ResourcesProfileForm
