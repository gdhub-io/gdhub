import { useMemo, useState } from 'react'
import InterestAuthorIcon from '@/assets/images/icons/interest-author-icon.svg'
import InterestMentorIcon from '@/assets/images/icons/interest-mentor-icon.svg'
import InterestSpecialistIcon from '@/assets/images/icons/interest-specialist-icon.svg'
import LogingBgImage from '@/assets/images/login-bg.jpg'
import { skillLevelsList } from '@/components/ui/skillLevel'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { GameDifficultyLevel, GameGenre, GameSetting } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import {
	Button,
	Typography,
	Form,
	Row,
	Col,
	Steps,
	Flex,
	Menu,
	Input,
	Space,
	AutoComplete,
	DatePicker,
	Checkbox,
	notification,
	Select,
	Tooltip,
	Segmented,
	InputNumber,
} from 'antd'
import { ItemType } from 'antd/es/menu/hooks/useItems'
import axios from 'axios'
import dayjs from 'dayjs'
import { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { FiChevronDown } from 'react-icons/fi'
import { PiWarningCircleLight } from 'react-icons/pi'
import countryList from 'react-select-country-list'
import styles from './style.module.scss'

const { Paragraph, Title, Text } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

const OnboardingPage: NextPage = () => {
	const router = useRouter()
	const { t } = useTolgee()
	const [formProfile] = Form.useForm()
	const [formSpeciality] = Form.useForm()
	const [formResources] = Form.useForm()
	const [formInterests] = Form.useForm()
	const [onboardingStep, setOnboardingStep] = useState(0)
	const [lastCompletedStep, setLastCompletedStep] = useState(0)
	const [isCompleted, setIsCompleted] = useState(false)
	const countries = useMemo(() => countryList().getData(), [])

	const { mutateAsync: sendRegistrationLink, isLoading: isRegistration } = useMutation((data: { email: string }) =>
		axios.post<void>('/api/email/registration', data)
	)
	const { data: gameGenres } = useQuery(['gameGenres'], () => axios.get<GameGenre[]>('/api/dictionary/game-genres'), {
		staleTime: Infinity,
	})
	const { data: gameSettings } = useQuery(
		['gameSettings'],
		() => axios.get<GameSetting[]>('/api/dictionary/game-settings'),
		{ staleTime: Infinity }
	)
	const { data: gameLevels } = useQuery(
		['gameLevels'],
		() => axios.get<GameDifficultyLevel[]>('/api/dictionary/game-levels'),
		{
			staleTime: Infinity,
		}
	)

	const onboardingMenu: ItemType<any>[] = [
		{ label: t('user-profile'), key: 'user-profile' },
		{ label: t('specilaity'), key: 'speciality', disabled: lastCompletedStep <= 0 },
		{ label: t('interests'), key: 'interests', disabled: lastCompletedStep <= 1 },
		{ label: t('resources'), key: 'resources', disabled: lastCompletedStep <= 2 },
	]

	const prepareOptions = (data?: any[]) => {
		if (!data) return []

		return data.map((i) => ({
			label: (
				<Typography.Text ellipsis>
					<T keyName={i.name} />
				</Typography.Text>
			),
			value: i.id,
		}))
	}

	// const handleSend = async () => {
	// 	const { email } = await form.validateFields()
	// 	const response = await sendRegistrationLink({ email })

	// 	setEmail(email)

	// 	if (response?.status == 204) {
	// 		setRegistrationStep(3)
	// 	} else {
	// 		message.error(response?.statusText)
	// 	}
	// }

	const handleSaveProfileAndNextStep = async () => {
		// const { data } = await formProfile.validateFields()

		console.log('formProfile', formProfile.getFieldsValue())

		setOnboardingStep(1)
		setLastCompletedStep(1)
	}

	const handleSaveSpecialityAndNextStep = async () => {
		// const { data } = await formSpeciality.validateFields()

		console.log('formSpeciality', formSpeciality.getFieldsValue())

		setOnboardingStep(2)
		setLastCompletedStep(2)
	}

	const handleSaveInterestsAndNextStep = async () => {
		const { data } = await formInterests.validateFields()

		console.log('formInterests', formInterests.getFieldsValue())

		setOnboardingStep(3)
		setLastCompletedStep(3)
	}

	const handleSaveResourcesAndFinish = async () => {
		// const { data } = await formResources.validateFields()

		console.log('formResources', formResources.getFieldsValue())

		setLastCompletedStep(3)
		setIsCompleted(true)
	}

	const handlePreviousStep = () => {
		setOnboardingStep((prev) => prev - 1)
	}

	return (
		<>
			<Head>
				<title>Registration</title>
			</Head>
			<div className={`${styles.container} bright-container`} style={{ backgroundImage: `url(${LogingBgImage.src})` }}>
				<div className="onboarding-box">
					<div className="onboarding-header">
						<Flex align="center">
							<Title style={{ flex: '400px' }}>
								<T keyName="registration">Registration</T>
							</Title>
							<Steps
								current={onboardingStep}
								className={styles.horizontalSteps}
								progressDot
								direction="horizontal"
								items={onboardingMenu}
								style={{ flex: 'auto' }}
							/>
						</Flex>
					</div>
					<div className="onboarding-container">
						<Row>
							<Col md={{ span: 5 }}>
								<div className="onboarding-sidemenu">
									<Menu
										className={styles.leftMenu}
										items={onboardingMenu}
										mode="vertical"
										selectedKeys={[onboardingMenu[onboardingStep].key]}
										onSelect={(info) => setOnboardingStep(onboardingMenu.findIndex((d) => d.key == info.key))}
										// selectable={false}
									/>
								</div>
							</Col>
							<Col md={{ span: 19 }}>
								{onboardingStep == 0 && (
									<div className="onboarding-content">
										<div className="onboarding-form">
											<div className="onboarding-form-title">
												<Title level={2}>
													<T keyName="user-profile">User Profile</T>
												</Title>
												<Paragraph italic>
													<T>General information about new member</T>
												</Paragraph>
											</div>

											<Form
												form={formProfile}
												layout="vertical"
												requiredMark="optional"
												autoComplete="off"
												scrollToFirstError
											>
												<Space direction="vertical" size={16} style={{ width: '100%' }}>
													<Row gutter={[32, 16]}>
														<Col xs={24} lg={12}>
															<Form.Item name="firstName" label={t('firstName')} rules={[{ required: true }]}>
																<Input placeholder={t('firstName.plachehloder')} />
															</Form.Item>
														</Col>
														<Col xs={24} lg={12}>
															<Form.Item name="lastName" label={t('lastName')} rules={[{ required: true }]}>
																<Input placeholder={t('lastName.plachehloder')} />
															</Form.Item>
														</Col>
														<Col xs={24} lg={12}>
															<Form.Item name="email" label={t('email')} rules={[{ required: true, type: 'email' }]}>
																<Input placeholder="max.pain@website.com" />
															</Form.Item>
														</Col>
													</Row>
													<Row gutter={[32, 16]}>
														<Col xs={24} lg={12}>
															<Form.Item name="yearOfBirth" label={t('yearOfBirth')} rules={[{ required: true }]}>
																<DatePicker
																	picker="year"
																	style={{ width: '100%' }}
																	disabledDate={(date) => date.year() > dayjs().subtract(18, 'year').year()}
																	// defaultValue={dayjs().subtract(24, 'years')}
																/>
															</Form.Item>
														</Col>
													</Row>
													<Row gutter={[32, 16]}>
														<Col xs={24} lg={12}>
															<Form.Item name="country" label={t('country')} rules={[{ required: true }]}>
																<AutoComplete
																	allowClear
																	placeholder={t('country.placeholder', 'Select country')}
																	suffixIcon={<FiChevronDown size={24} color="#afafaf" />}
																	filterOption={(inputValue, option) =>
																		option!.title.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
																	}
																>
																	{countries.map(({ value, label }: any) => (
																		<AutoComplete.Option key={value} value={label} title={label}>
																			{label}
																		</AutoComplete.Option>
																	))}
																</AutoComplete>
															</Form.Item>
														</Col>
														<Col xs={24} lg={12}>
															<Form.Item name="city" label={t('city')}>
																<Input placeholder={t('city.placeholder')} />
															</Form.Item>
														</Col>
													</Row>

													<Form.Item
														name="confirmUserData"
														valuePropName="checked"
														noStyle
														rules={[
															{
																validator: (_, value) => {
																	if (!value) {
																		notification.error({
																			message: 'You should confirm the accuracy of the information entered',
																		})
																	}
																	return value ? Promise.resolve() : Promise.reject()
																},
															},
														]}
													>
														<Checkbox>
															<T keyName="confirmUserData">I confirm the accuracy of the information entered</T>
														</Checkbox>
													</Form.Item>
													<Form.Item
														name="agreement2"
														valuePropName="checked"
														noStyle
														rules={[
															{
																validator: (_, value) => {
																	if (!value) {
																		notification.error({ message: 'Should accept agreement 2' })
																	}
																	return value ? Promise.resolve() : Promise.reject()
																},
															},
														]}
													>
														<Checkbox>
															I have read the <a href="">agreement 2</a>
														</Checkbox>
													</Form.Item>
													<Form.Item name="agreement3" valuePropName="checked" noStyle>
														<Checkbox>
															I have read the <a href="">agreement 3</a>
														</Checkbox>
													</Form.Item>
												</Space>
											</Form>
										</div>
										<div className="onboarding-footer">
											<span></span>
											<Button type="primary" onClick={handleSaveProfileAndNextStep}>
												<T keyName="saveAndContinue">Save and continue</T>
											</Button>
										</div>
									</div>
								)}

								{onboardingStep == 1 && (
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

											<Form
												form={formSpeciality}
												layout="vertical"
												requiredMark="optional"
												autoComplete="off"
												scrollToFirstError
											>
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
																			{item.value !== formSpeciality.getFieldValue('Level') ? (
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
															<Form.Item name="specialisation" label={t('specialisation')}>
																<Input.TextArea placeholder={t('specialisation.plachehloder')} />
															</Form.Item>
														</Col>
													</Row>
													<Row gutter={[32, 16]}>
														<Col xs={24} lg={24}>
															<Form.Item name="cvLink" label={t('cvLink')} rules={[{ type: 'url' }]}>
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
															<Form.Item name="experience" label={t('experience')} rules={[{ required: true }]}>
																<Input.TextArea placeholder={t('experience.plachehloder')} rows={4} />
															</Form.Item>
														</Col>
													</Row>
													<Row gutter={[32, 16]}>
														<Col xs={24} lg={24}>
															<Form.Item name="education" label={t('education')}>
																<Input.TextArea placeholder={t('education.plachehloder')} rows={4} />
															</Form.Item>
														</Col>
													</Row>
												</Space>
											</Form>
										</div>
										<div className="onboarding-footer">
											<Button onClick={handlePreviousStep}>
												<T keyName="back">Back</T>
											</Button>
											<Button type="primary" onClick={handleSaveSpecialityAndNextStep}>
												<T keyName="saveAndContinue">Save and continue</T>
											</Button>
										</div>
									</div>
								)}

								{onboardingStep == 2 && (
									<div className="onboarding-content">
										<div className="onboarding-form">
											<div className="onboarding-form-title">
												<Flex justify="space-between" align="center">
													<Title level={2}>
														<T keyName="interests">Interests</T>
													</Title>
													<Flex align="center" gap={4}>
														<PiWarningCircleLight size={20} color="#05050573" style={{ height: 20 }} />
														<Text type="secondary" italic>
															<T>You can change it or add more ones after</T>
														</Text>
													</Flex>
												</Flex>

												<Paragraph italic>
													<T>Infomation about your preferences</T>
												</Paragraph>
											</div>

											<Form
												form={formInterests}
												layout="vertical"
												requiredMark="optional"
												autoComplete="off"
												scrollToFirstError
												initialValues={{ mainInterest: 'specialist' }}
											>
												<Space direction="vertical" size={16} style={{ width: '100%' }}>
													<Row gutter={[32, 16]}>
														<Col xs={24} lg={24}>
															<Form.Item name="mainInterest" label={t('interest')} rules={[{ required: true }]}>
																<Segmented
																	block
																	className={styles.interest}
																	options={[
																		{
																			label: (
																				<div className={styles.segmentedOption}>
																					<div className="segmented-option-content">
																						<InterestAuthorIcon height={56} width={56} />
																						<Paragraph>
																							I want to be an <Text italic>Author</Text>
																						</Paragraph>
																					</div>
																					<div className="segmented-option-footer">
																						<Text>I want to create games for myself</Text>
																					</div>
																				</div>
																			),
																			value: 'author',
																		},
																		{
																			label: (
																				<div className={styles.segmentedOption}>
																					<div className="segmented-option-content">
																						<InterestSpecialistIcon height={56} width={56} />
																						<Paragraph>
																							I want to be a <Text italic>Specialist</Text>
																						</Paragraph>
																					</div>
																					<div className="segmented-option-footer">
																						<Text>I want to join the team</Text>
																					</div>
																				</div>
																			),
																			value: 'specialist',
																		},
																		{
																			label: (
																				<div className={styles.segmentedOption}>
																					<div className="segmented-option-content">
																						<InterestMentorIcon height={56} width={56} />
																						<Paragraph>
																							I want to be a <Text italic>Mentor</Text>
																						</Paragraph>
																					</div>
																					<div className="segmented-option-footer">
																						<Text>I want to share my expertise</Text>
																					</div>
																				</div>
																			),
																			value: 'mentor',
																		},
																	]}
																/>
															</Form.Item>
														</Col>
													</Row>

													<Row>
														<Col xs={24} lg={24}>
															<Form.Item name="preferredGenres" label={t('form.genres.label')}>
																<Select
																	options={prepareOptions(gameGenres?.data)}
																	mode="multiple"
																	allowClear
																	style={{ width: '100%' }}
																	placeholder={t('select')}
																	onChange={() => {}}
																/>
															</Form.Item>
														</Col>
													</Row>

													<Row>
														<Col xs={24} lg={24}>
															<Form.Item name="preferredSettings" label={t('form.settings.label')}>
																<Select
																	options={prepareOptions(gameSettings?.data)}
																	mode="multiple"
																	allowClear
																	style={{ width: '100%' }}
																	placeholder={t('select')}
																	onChange={() => {}}
																/>
															</Form.Item>
														</Col>
													</Row>
													<Row>
														<Col xs={24} lg={24}>
															<Form.Item name="preferredLevels" label={t('form.difficulty.label')}>
																<Select
																	options={prepareOptions(gameLevels?.data)}
																	mode="multiple"
																	allowClear
																	style={{ width: '100%' }}
																	placeholder={t('select')}
																	onChange={() => {}}
																/>
															</Form.Item>
														</Col>
													</Row>
												</Space>
											</Form>
										</div>
										<div className="onboarding-footer">
											<Button onClick={handlePreviousStep}>
												<T keyName="back">Back</T>
											</Button>
											<Button type="primary" onClick={handleSaveInterestsAndNextStep}>
												<T keyName="saveAndContinue">Save and continue</T>
											</Button>
										</div>
									</div>
								)}

								{onboardingStep == 3 && (
									<div className="onboarding-content">
										<div className="onboarding-form">
											<div className="onboarding-form-title">
												<Title level={2}>
													<T keyName="resources">Recources</T>
												</Title>
												<Paragraph italic>
													<T>How can you be useful to teams?</T>
												</Paragraph>
												<Paragraph italic type="secondary">
													<T>
														The main resource is your time, which you are willing to spend on participating in projects.
														You can also provide additional information
													</T>
												</Paragraph>
											</div>

											<Form
												form={formResources}
												layout="vertical"
												requiredMark="optional"
												autoComplete="off"
												scrollToFirstError
												initialValues={{ availableForOffer: true }}
											>
												<Space direction="vertical" size={16} style={{ width: '100%' }}>
													<Form.Item
														label={<T keyName="availableTime" />}
														tooltip={{ title: t('How many hours a week can you devote to projects?') }}
														wrapperCol={{ span: 24 }}
														required
														valuePropName="value"
													>
														<Row>
															<Col md={{ span: 12 }} xs={{ span: 24 }}>
																<Space>
																	<Form.Item name="timeForWorkMin" noStyle rules={[{ required: true }]}>
																		<InputNumber min={1} max={55} placeholder={t('minimum')} />
																	</Form.Item>
																	<Text>—</Text>
																	<Form.Item
																		name="timeForWorkMax"
																		noStyle
																		rules={[
																			{ required: true },
																			{
																				validator: (_, value) =>
																					formResources.getFieldValue('timeForWorkMin') > value
																						? Promise.reject(t('The maximum value cannot be less than the minimum'))
																						: Promise.resolve(),
																			},
																		]}
																	>
																		<InputNumber min={2} max={56} placeholder={t('maximum')} />
																	</Form.Item>
																	<Text>
																		<T keyName="hours" />
																	</Text>
																</Space>
															</Col>
														</Row>
													</Form.Item>

													<Form.Item name="availableForOffer" valuePropName="checked">
														<Checkbox>
															<T>I&apos;m available for offering</T>
														</Checkbox>
													</Form.Item>

													<Form.Item name="additionalText" label={t('additionalInformation')}>
														<Input.TextArea rows={8} />
													</Form.Item>
												</Space>
											</Form>
										</div>
										<div className="onboarding-footer">
											<Button onClick={handlePreviousStep}>
												<T keyName="back">Back</T>
											</Button>
											<Button type="primary" onClick={handleSaveResourcesAndFinish}>
												<T keyName="save">Save</T>
											</Button>
										</div>
									</div>
								)}
							</Col>
						</Row>
					</div>
				</div>
			</div>
		</>
	)
}

export const getServerSideProps = async (context: any) => {
	const session = await getServerSession(context.req, context.res, authOptions)

	if (session?.user) {
		return {
			redirect: {
				destination: '/hub',
				permanent: false,
			},
		}
	}

	return {
		props: {},
	}
}

export default OnboardingPage
