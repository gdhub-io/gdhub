import { useEffect, useState } from 'react'
import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { OnboardingCompleted } from '@/components/onboarding/OnboardingCompleted'
import { OnboardingError } from '@/components/onboarding/OnboardingError'
import { OnboardingInterestStep } from '@/components/onboarding/OnboardingInterestStep'
import { OnboardingProfileStep } from '@/components/onboarding/OnboardingProfileStep'
import { OnboardingSpecialityStep } from '@/components/onboarding/OnboardingSpecialityStep'
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome'
import { GameDifficultyLevel, GameGenre, GameSetting } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Typography, Form, Row, Col, Steps, Flex, Menu, Input, Space, Checkbox, InputNumber } from 'antd'
import { ItemType } from 'antd/es/menu/hooks/useItems'
import axios from 'axios'
import Head from 'next/head'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Paragraph, Title, Text } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

const OnboardingPage = () => {
	const { t } = useTolgee()
	const [formResources] = Form.useForm()
	const [formInterests] = Form.useForm()
	const [error, setError] = useState<string>()
	const [onboardingStep, setOnboardingStep] = useState(-1)
	const [lastCompletedStep, setLastCompletedStep] = useState(0)
	const [isCompleted, setIsCompleted] = useState(false)

	const onboardingMenu: ItemType<any>[] = [
		{ label: t('user-profile'), key: 'user-profile' },
		{ label: t('specilaity'), key: 'speciality', disabled: lastCompletedStep <= 0 },
		{ label: t('interests'), key: 'interests', disabled: lastCompletedStep <= 1 },
		{ label: t('resources'), key: 'resources', disabled: lastCompletedStep <= 2 },
	]

	// updating last completed step
	useEffect(() => {
		if (onboardingStep > lastCompletedStep) setLastCompletedStep(onboardingStep)
		if (isCompleted) setLastCompletedStep(3)
	}, [onboardingStep])

	const onProfileLoading = () => {
		setOnboardingStep(0)
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

			{onboardingStep == -1 && <OnboardingWelcome onNext={() => setOnboardingStep(0)} />}

			{onboardingStep >= 0 && (
				<div className={`${styles.container}`} style={{ backgroundImage: `url(${RegistrationBgImage.src})` }}>
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
										<OnboardingProfileStep onLoading={onProfileLoading} onSave={() => handleNextStep()} />
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
										<OnboardingInterestStep
											onSave={() => handleNextStep()}
											onPreviousStep={() => handlePreviousStep()}
										/>
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
															The main resource is your time, which you are willing to spend on participating in
															projects. You can also provide additional information
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
			)}
		</>
	)
}

// export const getServerSideProps = async (context: GetServerSidePropsContext) => {
// 	const session = await getServerSession(context.req, context.res, authOptions)
// 	const registrationToken = context.query.token as string
// 	const publicAccessToken = Buffer.from(env('NEXT_PUBLIC_API_KEY')).toString('base64')

// 	if (!registrationToken && !session?.user) {
// 		return {
// 			props: { error: 'Registration token is wrong. Go to Signup page before.' },
// 		}
// 	}

// 	if (registrationToken) {
// 		const registration = await prisma.registration.findUnique({ where: { registrationToken } })

// 		if (!registration) {
// 			return {
// 				props: { error: 'The registration link is incorrect or has already been used' },
// 			}
// 		}

// 		if (dayjs(registration.expires).diff() <= 0) {
// 			await prisma.registration.delete({ where: { id: registration?.id } })
// 			return {
// 				props: { error: 'Registration token expired' } as IOnboardingPage,
// 			}
// 		}
// 	}

// 	if (session?.user && session.user.onboardingDone) {
// 		return {
// 			redirect: {
// 				destination: '/hub',
// 				permanent: false,
// 			},
// 		}
// 	}

// 	return {
// 		props: {
// 			userId: session?.user.id || null,
// 			publicAccessToken,
// 		} as IOnboardingPage,
// 	}
// }

export default OnboardingPage
