import { useMemo, useState } from 'react'
import { skillLevelsList } from '@/components/ui/skillLevel'
import { Speciality, WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import {
	Flex,
	Form,
	Space,
	Row,
	Col,
	Input,
	Select,
	Tooltip,
	Button,
	Typography,
	message,
	Spin,
	Grid,
	Upload,
	UploadProps,
} from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import { PiWarningCircleLight } from 'react-icons/pi'

interface IOnboardingSpecialityStep {
	onSave: () => void
	onPreviousStep: () => void
}

const { Paragraph, Title, Text } = Typography

export const OnboardingSpecialityStep = ({ onSave, onPreviousStep = () => {} }: IOnboardingSpecialityStep) => {
	const [form] = Form.useForm()
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()

	const [showParseCVButton, setShowParseCVButton] = useState(false)
	const [isParsing, setIsParsing] = useState(false)
	const [jobPosition, setJobPosition] = useState<string>('')

	const {
		data: workDirections,
		isLoading,
		isFetched,
	} = useQuery(['workDirections'], () => axios.get<WorkDirection[]>('/api/dictionary/work-directions'), {
		staleTime: Infinity,
	})

	useQuery(
		['profile', 'current'],
		() => axios.get<Speciality & { direction: WorkDirection }>('/api/auth/registration/onboarding/speciality'),
		{
			refetchInterval: false,
			refetchOnWindowFocus: false,
			onSuccess(response) {
				const { id, name, level, direction, skills, tools, summary, specialization, portfolioUrl, jobs, schools } =
					response.data

				form.setFieldsValue({
					id,
					name,
					level,
					workDirectionId: direction?.id,
					specialization,
					portfolioUrl,
					skills,
					tools: tools?.split('\n'),
					summary,
					jobs,
					schools,
				})

				const existNameValue = !!form.getFieldValue('name')
				setShowParseCVButton(existNameValue)
			},
		}
	)

	const { mutateAsync: createSpeciality, isLoading: isCreating } = useMutation(({ data }: any) =>
		axios.post<any>('/api/auth/registration/onboarding/speciality', { data })
	)

	const { mutateAsync: updateSpeciality, isLoading: isUpdating } = useMutation(({ id, data }: any) =>
		axios.put<any>('/api/auth/registration/onboarding/speciality', { id, data })
	)

	const workDirectionOptions = workDirections?.data.map((direction) => ({
		value: direction.id,
		label: <T keyName={`workDirection-${direction.name}`}>{direction.name}</T>,
	}))

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

	const uploadProps: UploadProps = useMemo(
		() => ({
			name: 'file',
			accept: '.pdf',
			action: '/api/user/parse/cv',
			showUploadList: false,
			data: { jobPosition, locale: router.locale },
			maxCount: 1,
			onChange: ({ file }) => {
				if (file.status === 'done' && (!file.response || file.response.success == false)) {
					setIsParsing(false)
					message.error(t('uploadcv-error-message', `We couldn't process your file. Enter data manually`))
					return
				}

				if (file.status == 'uploading') {
					setIsParsing(true)
				}

				if (file.status == 'error') {
					message.error(file.error)
					setIsParsing(false)
				}

				if (file.status === 'done') {
					console.log('fillForm', file)
					fillForm(file.response)
					setIsParsing(false)
				}
			},
		}),
		[form, jobPosition]
	)

	const fillForm = (data: any) => {
		const { workAreaId, tools, summary, specialization, skills, experience, education, portfolioLink } = data

		if (workAreaId)
			form.setFieldsValue({
				summary,
				workDirectionId: workAreaId,
				specialization,
				skills: skills?.join('\n'),
				tools: tools?.join('\n'),
				portfolioUrl: portfolioLink,
				jobs: experience?.map((job: any) => `${job.from} - ${job.to}, ${job.roleName}, ${job.companyName}`).join('\n'),
				schools: education
					?.map(
						(school: any) => `${school.from} - ${school.to}, ${school.speciality}, ${school.degree}, ${school.school}`
					)
					.join('\n'),
			})
	}

	const handleJobPositionChange = (value: string) => {
		setShowParseCVButton(!!value)
		setJobPosition(value)
	}

	return (
		<Spin spinning={(isLoading && !isFetched) || isParsing}>
			<div className="onboarding-content">
				<div className="onboarding-form">
					<Space direction="vertical" className="onboarding-form-title" style={{ width: '100%' }}>
						<Flex justify="space-between" align="center" wrap="wrap">
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
					</Space>

					<Form form={form} layout="vertical" requiredMark="optional" autoComplete="off" scrollToFirstError>
						<Form.Item name="id" hidden>
							<Input />
						</Form.Item>

						<Form.Item name="tools" hidden>
							<Input />
						</Form.Item>

						<Form.Item name="summary" hidden>
							<Input />
						</Form.Item>

						<Space direction="vertical" size={16} style={{ width: '100%' }}>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={16}>
									<Form.Item
										name="name"
										label={t('specialityName')}
										rules={[{ required: true }]}
										extra={
											showParseCVButton && (
												<Space style={{ marginTop: 4 }}>
													<Text>
														<T>Fill in from CV/resume</T>
													</Text>
													<Upload {...uploadProps} disabled={isParsing}>
														<Button size="small" disabled={isParsing} loading={isParsing}>
															<T>Upload PDF</T>
														</Button>
													</Upload>
												</Space>
											)
										}
									>
										<Input
											placeholder={t('specialityName.plachehloder')}
											onChange={(e) => handleJobPositionChange(e.target.value)}
										/>
									</Form.Item>
								</Col>
								<Col xs={24} lg={8}>
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
											placeholder={t(`For example: Game Design`)}
											options={workDirectionOptions}
										/>
									</Form.Item>
								</Col>
							</Row>

							<Form.Item name="specialization" label={t('specialization')} rules={[{ required: true }]}>
								<Input.TextArea placeholder={t('specialization.plachehloder')} />
							</Form.Item>

							<Form.Item name="portfolioUrl" label={t('cvLink')} rules={[{ type: 'url' }]}>
								<Input placeholder={t('cvLink.plachehloder')} />
							</Form.Item>

							<Row gutter={[32, 16]}>
								<Col xs={24} lg={24}>
									<Form.Item
										name="skills"
										label={t('skillList')}
										wrapperCol={{ span: 24 }}
										extra={t('skillList.extra')}
									>
										<Input.TextArea rows={4} placeholder={t('skillList.plachehloder')} />
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
				<Space
					className="onboarding-footer"
					wrap
					size={16}
					style={screens.lg ? { flexDirection: 'row' } : { flexDirection: 'column-reverse' }}
				>
					<Button onClick={onPreviousStep}>
						<T keyName="back">Back</T>
					</Button>
					<Space>
						<Button type="text" onClick={() => router.push('/hub')}>
							<T keyName="onboarding.welcome.later">Continue later</T>
						</Button>
						<Button type="primary" onClick={handleSave} loading={isCreating || isUpdating}>
							<T keyName="saveAndContinue">Save and continue</T>
						</Button>
					</Space>
				</Space>
			</div>
		</Spin>
	)
}
