import { skillLevelsList } from '@/components/ui/skillLevel'
import { Speciality, WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Flex, Form, Space, Row, Col, Input, Select, Tooltip, Button, Typography, message, Spin } from 'antd'
import axios from 'axios'
import { PiWarningCircleLight } from 'react-icons/pi'

interface IOnboardingSpecialityStep {
	onSave: () => void
	onPreviousStep: () => void
}

const { Paragraph, Title, Text } = Typography

export const OnboardingSpecialityStep = ({ onSave, onPreviousStep = () => {} }: IOnboardingSpecialityStep) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()

	const {
		data: workDirections,
		isLoading,
		isFetched,
	} = useQuery(['workDirections'], () => axios.get<WorkDirection[]>('/api/dictionary/work-directions'), {
		staleTime: Infinity,
	})

	const { data: profileData } = useQuery(
		['profile', 'current'],
		() => axios.get<Speciality & { direction: WorkDirection }>('/api/user/speciality'),
		{
			onSuccess(response) {
				const { id, name, level, direction, skills, specialization, portfolioUrl, jobs, schools } = response.data

				form.setFieldsValue({
					id,
					name,
					level,
					workDirectionId: direction.id,
					specialization,
					portfolioUrl,
					skills,
					jobs,
					schools,
				})
			},
		}
	)

	const { mutateAsync: createSpeciality } = useMutation(({ data }: any) =>
		axios.post<any>('/api/user/speciality', { data })
	)

	const { mutateAsync: updateSpeciality } = useMutation(({ id, data }: any) =>
		axios.put<any>('/api/user/speciality', { id, data })
	)

	const workDirectionOptions = workDirections?.data.map((direction) => ({ value: direction.id, label: direction.name }))

	const handleSave = async () => {
		try {
			const data = await form.validateFields()

			console.log('formSpeciality', form.getFieldsValue())

			if (data.id) {
				await updateSpeciality({ id: data.id, data })
			} else {
				await createSpeciality({ data })
			}

			onSave()
		} catch (error: any) {
			if (!error.response || !error.message) return

			message.error(error.response?.data?.message || error.message)
		}
	}

	return (
		<Spin spinning={isLoading && !isFetched}>
			<div className="onboarding-content">
				<div className="onboarding-form">
					<div className="onboarding-form-title">
						<Flex justify="space-between" align="center">
							<Title level={2}>
								<T keyName="specilaity">Speciality</T>
							</Title>
							<Flex align="center" gap={4}>
								<PiWarningCircleLight size={20} color="#05050573" style={{ height: 20 }} />
								<Text type="secondary" italic>
									<T>You can change it or add more ones after</T>
								</Text>
							</Flex>
						</Flex>

						<Paragraph italic>
							<T>Information about your main speciality</T>
						</Paragraph>
					</div>

					<Form form={form} layout="vertical" requiredMark="optional" autoComplete="off" scrollToFirstError>
						<Form.Item name="id" hidden>
							<Input />
						</Form.Item>

						<Space direction="vertical" size={16} style={{ width: '100%' }}>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={12}>
									<Form.Item name="name" label={t('specialityName')} rules={[{ required: true }]}>
										<Input placeholder={t('specialityName.plachehloder')} />
									</Form.Item>
								</Col>
								<Col xs={24} lg={12}>
									<Form.Item
										name="level"
										label={t('specialityLevel')}
										rules={[{ required: true }]}
										wrapperCol={{ span: 24 }}
									>
										<Select placeholder={t('select')} style={{ width: '100%' }}>
											{skillLevelsList.map((item, indx: number) => (
												<Select.Option key={indx.toString()} value={item.value}>
													{item.value !== form.getFieldValue('Level') ? (
														<Tooltip title={item.description} placement="right">
															{item.icon} {item.label}
														</Tooltip>
													) : (
														<>
															{item.icon} {item.label}
														</>
													)}
												</Select.Option>
											))}
										</Select>
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={24}>
									<Form.Item name="workDirectionId" label={t('workDirection')} rules={[{ required: true }]}>
										<Select
											style={{ width: '100%' }}
											placeholder={`Например: геймдизайн`}
											options={workDirectionOptions}
										/>
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={24}>
									<Form.Item name="specialization" label={t('specialization')} rules={[{ required: true }]}>
										<Input.TextArea placeholder={t('specialization.plachehloder')} />
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={24}>
									<Form.Item name="portfolioUrl" label={t('cvLink')} rules={[{ type: 'url' }]}>
										<Input placeholder={t('cvLink.plachehloder')} />
									</Form.Item>
								</Col>
							</Row>

							<Row gutter={[32, 16]}>
								<Col xs={24} lg={24}>
									<Form.Item
										name="skills"
										label={t('skillList')}
										wrapperCol={{ span: 24 }}
										extra={t('skillList.extra')}
										// extra="Каждый навык пишите c новой строки. Указывайте в формате: глагол + определение"
									>
										<Input.TextArea
											rows={4}
											placeholder={t('skillList.plachehloder')}
											// placeholder={`Например:\nрисовать концепты мультяшных персонажей\nразрабатывать диалоговые системы`}
										/>
									</Form.Item>
								</Col>
							</Row>

							<Row gutter={[32, 16]}>
								<Col xs={24} lg={24}>
									<Form.Item name="jobs" label={t('experience')} rules={[{ required: true }]}>
										<Input.TextArea placeholder={t('experience.plachehloder')} rows={4} />
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={24}>
									<Form.Item name="schools" label={t('education')}>
										<Input.TextArea placeholder={t('education.plachehloder')} rows={4} />
									</Form.Item>
								</Col>
							</Row>
						</Space>
					</Form>
				</div>
				<div className="onboarding-footer">
					<Button onClick={onPreviousStep}>
						<T keyName="back">Back</T>
					</Button>
					<Button type="primary" onClick={handleSave}>
						<T keyName="saveAndContinue">Save and continue</T>
					</Button>
				</div>
			</div>
		</Spin>
	)
}
