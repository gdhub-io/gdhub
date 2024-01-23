import { useEffect, useState } from 'react'
import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { OnboardingCompleted } from '@/components/onboarding/OnboardingCompleted'
import { OnboardingError } from '@/components/onboarding/OnboardingError'
import { OnboardingInterestStep } from '@/components/onboarding/OnboardingInterestStep'
import { OnboardingProfileStep } from '@/components/onboarding/OnboardingProfileStep'
import { OnboardingResourceStep } from '@/components/onboarding/OnboardingResourceStep'
import { OnboardingSpecialityStep } from '@/components/onboarding/OnboardingSpecialityStep'
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome'
import { T, useTolgee } from '@tolgee/react'
import { Typography, Row, Col, Steps, Flex, Menu } from 'antd'
import { ItemType } from 'antd/es/menu/hooks/useItems'
import Head from 'next/head'
import styles from './style.module.scss'

const { Title } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

const OnboardingPage = () => {
	const { t } = useTolgee()
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

	const handlePreviousStep = () => {
		setOnboardingStep((prev) => prev - 1)
	}

	const handleNextStep = () => {
		setOnboardingStep((prev) => prev + 1)
	}

	const handleComplete = () => {
		setIsCompleted(true)
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
										<OnboardingResourceStep
											onSave={() => handleComplete()}
											onPreviousStep={() => handlePreviousStep()}
										/>
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
