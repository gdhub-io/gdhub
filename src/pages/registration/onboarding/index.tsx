import { useEffect, useState } from 'react'
import InterestAuthorIcon from '@/assets/images/icons/interest-author-icon.svg'
import InterestMentorIcon from '@/assets/images/icons/interest-mentor-icon.svg'
import InterestSpecialistIcon from '@/assets/images/icons/interest-specialist-icon.svg'
import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { OnboardingCompleted } from '@/components/onboarding/OnboardingCompleted'
import { OnboardingError } from '@/components/onboarding/OnboardingError'
import { OnboardingProfileStep } from '@/components/onboarding/OnboardingProfileStep'
import { OnboardingSpecialityStep } from '@/components/onboarding/OnboardingSpecialityStep'
import { env } from '@/helpers/env'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/services/prisma'
import { GameDifficultyLevel, GameGenre, GameSetting } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
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
	Checkbox,
	Select,
	Segmented,
	InputNumber,
} from 'antd'
import { ItemType } from 'antd/es/menu/hooks/useItems'
import axios from 'axios'
import dayjs from 'dayjs'
import { GetServerSidePropsContext } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { PiWarningCircleLight } from 'react-icons/pi'
import styles from './style.module.scss'

interface IOnboardingPage {
	error?: string
	userId: string | null
	publicAccessToken: string
}

const { Paragraph, Title, Text } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

const OnboardingPage = ({ error, userId, publicAccessToken }: IOnboardingPage) => {
	const router = useRouter()
	const { t } = useTolgee()
	const [formSpeciality] = Form.useForm()
	const [formResources] = Form.useForm()
	const [formInterests] = Form.useForm()
	const [onboardingStep, setOnboardingStep] = useState(0)
	const [lastCompletedStep, setLastCompletedStep] = useState(0)
	const [isCompleted, setIsCompleted] = useState(false)

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

	// updating last completed step
	useEffect(() => {
		if (onboardingStep > lastCompletedStep) setLastCompletedStep(onboardingStep)
		if (isCompleted) setLastCompletedStep(3)
	}, [onboardingStep])

	const onProfileLoading = () => {
		setOnboardingStep(1)
	}

	const handleSaveInterestsAndNextStep = async () => {
		const { data } = await formInterests.validateFields()

		console.log('formInterests', formInterests.getFieldsValue())

		setOnboardingStep(3)
	}

	const handleSaveResourcesAndFinish = async () => {
		// const { data } = await formResources.validateFields()

		console.log('formResources', formResources.getFieldsValue())

		setIsCompleted(true)
	}

	const handleNextStep = () => {
		setOnboardingStep((prev) => prev + 1)
	}

	const handlePreviousStep = () => {
		setOnboardingStep((prev) => prev - 1)
	}

	if (error) {
		return (
			<>
				<Head>
					<title>{t('meta.registration.header', 'Registration')}</title>
				</Head>
				<OnboardingError error={error} />
			</>
		)
	}

	if (isCompleted) {
		return (
			<>
				<Head>
					<title>{t('meta.registration.header', 'Registration')}</title>
				</Head>
				<OnboardingCompleted />
			</>
		)
	}

	return (
		<>
			<Head>
				<title>{t('meta.registration.header', 'Registration')}</title>
			</Head>
			<div
				className={`${styles.container} bright-container`}
				style={{ backgroundImage: `url(${RegistrationBgImage.src})` }}
			>
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
								{/* Profile */}
								{onboardingStep == 0 && (
									<OnboardingProfileStep
										onLoading={onProfileLoading}
										onSave={() => handleNextStep()}
										publicAccessToken={publicAccessToken}
									/>
								)}

								{/* Speciality */}
								{onboardingStep == 1 && (
									<OnboardingSpecialityStep
										onSave={() => handleNextStep()}
										onPreviousStep={() => handlePreviousStep()}
									/>
								)}

								{/* Interests */}
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
												initialValues={{ mainInterest: router.query.interest || 'specialist' }}
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

								{/* Resource */}
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const session = await getServerSession(context.req, context.res, authOptions)
	const registrationToken = context.query.token as string
	const publicAccessToken = Buffer.from(env('NEXT_PUBLIC_API_KEY')).toString('base64')

	if (!registrationToken && !session?.user) {
		return {
			props: { error: 'Registration token is wrong. Go to Signup page before.' },
		}
	}

	if (registrationToken) {
		const registration = await prisma.registration.findUnique({ where: { registrationToken } })

		if (!registration) {
			return {
				props: { error: 'The registration link is incorrect or has already been used' },
			}
		}

		if (dayjs(registration.expires).diff() <= 0) {
			await prisma.registration.delete({ where: { id: registration?.id } })
			return {
				props: { error: 'Registration token expired' } as IOnboardingPage,
			}
		}
	}

	if (session?.user && session.user.onboardingDone) {
		return {
			redirect: {
				destination: '/hub',
				permanent: false,
			},
		}
	}

	return {
		props: {
			userId: session?.user.id || null,
			publicAccessToken,
		} as IOnboardingPage,
	}
}

export default OnboardingPage
