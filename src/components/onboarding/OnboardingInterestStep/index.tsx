import { useMemo } from 'react'
import InterestAuthorIcon from '@/assets/images/icons/interest-author-icon.svg'
import InterestMentorIcon from '@/assets/images/icons/interest-mentor-icon.svg'
import InterestSpecialistIcon from '@/assets/images/icons/interest-specialist-icon.svg'
import { GameDifficultyLevel, GameGenre, GameSetting, PrimaryInterest } from '@prisma/client'
import { PiWarningCircleLight } from '@react-icons/all-files/pi/PiWarningCircleLight'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Col, Flex, Form, Grid, Input, Radio, Row, Segmented, Select, Space, Typography, message } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

interface IOnboardingInterestStep {
	onSave: () => void
	onPreviousStep: () => void
}

const { Paragraph, Title, Text } = Typography

export const OnboardingInterestStep = ({ onSave, onPreviousStep = () => {} }: IOnboardingInterestStep) => {
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const { data: session } = useSession()

	const preSelectedInterest = useMemo(() => {
		switch (router.query.for) {
			case 'author':
				return PrimaryInterest.Author
			case 'specialist':
				return PrimaryInterest.Specialist
			case 'mentor':
				return PrimaryInterest.Mentor
			default:
				return undefined
		}
	}, [router.query.for])

	useQuery(['profile', session?.user.id], () => axios.get<any>('/api/auth/registration/onboarding/interest'), {
		enabled: !!session?.user.id,
		refetchInterval: false,
		refetchOnWindowFocus: false,
		onSuccess: (response) => {
			if (!response.data) return

			const { primaryInterest, preferredGenres, preferredSettings, preferredLevels } = response.data

			form.setFieldsValue({
				primaryInterest: preSelectedInterest || primaryInterest, //selected or default option
				preferredGenres: preferredGenres.map((d: Record<string, string>) => d.id),
				preferredSettings: preferredSettings.map((d: Record<string, string>) => d.id),
				preferredLevels: preferredLevels.map((d: Record<string, string>) => d.id),
			})
		},
	})

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

	const { mutateAsync: updateProfile, isLoading: isUpdatingInterests } = useMutation(({ data }: any) =>
		axios.put<any>('/api/auth/registration/onboarding/interest', data)
	)

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

	const handleSave = async () => {
		try {
			const data = await form.validateFields()

			await updateProfile({ data })

			onSave()
		} catch (error: any) {
			if (!error.response || !error.message) return

			message.error(error.response?.data?.message || error.message)
		}
	}

	return (
		<div className={styles.content}>
			<div className="onboarding-content">
				<div className="onboarding-form">
					<Space direction="vertical" className="onboarding-form-title" style={{ width: '100%' }}>
						<Flex justify="space-between" align="center" wrap="wrap">
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
							<T keyName="onboarding.interests.motivation.description">
								Information about your motivations and preferences. This information will allow the platform to suggest
								you the most suitable projects, vacancies or candidates for your project.
							</T>
						</Paragraph>
					</Space>

					<Form
						form={form}
						layout="vertical"
						requiredMark="optional"
						autoComplete="off"
						scrollToFirstError
						onValuesChange={(a, b) => console.log('change', a, b)}
						initialValues={{ primaryInterest: preSelectedInterest }}
					>
						<Space direction="vertical" size={16} style={{ width: '100%' }}>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={24}>
									<Form.Item name="primaryInterest" label={t('interest')} rules={[{ required: true }]}>
										{screens.lg && (
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
																		<T keyName="wantToBe.text">I want to be</T> <Text italic>Author</Text>
																	</Paragraph>
																</div>
																<div className="segmented-option-footer">
																	<Text>I want to create games for myself</Text>
																</div>
															</div>
														),
														value: PrimaryInterest.Author,
													},
													{
														label: (
															<div className={styles.segmentedOption}>
																<div className="segmented-option-content">
																	<InterestSpecialistIcon height={56} width={56} />
																	<Paragraph>
																		<T keyName="wantToBe.text">I want to be</T> <Text italic>Specialist</Text>
																	</Paragraph>
																</div>
																<div className="segmented-option-footer">
																	<Text>I want to join the team</Text>
																</div>
															</div>
														),
														value: PrimaryInterest.Specialist,
													},
													{
														label: (
															<div className={styles.segmentedOption}>
																<div className="segmented-option-content">
																	<InterestMentorIcon height={56} width={56} />
																	<Paragraph>
																		<T keyName="wantToBe.text">I want to be</T> <Text italic>Mentor</Text>
																	</Paragraph>
																</div>
																<div className="segmented-option-footer">
																	<Text>I want to share my expertise</Text>
																</div>
															</div>
														),
														value: PrimaryInterest.Mentor,
													},
												]}
											/>
										)}

										{!screens.lg && (
											<Radio.Group>
												<Space direction="vertical">
													<Radio value={PrimaryInterest.Author}>
														<T keyName="wantToBe.text">I want to be</T>{' '}
														<Text italic>
															<T keyName="wantToBe.author">Author</T>
														</Text>
													</Radio>
													<Radio value={PrimaryInterest.Specialist}>
														<T keyName="wantToBe.text">I want to be</T>{' '}
														<Text italic>
															<T keyName="wantToBe.specialist">Specialist</T>
														</Text>
													</Radio>
													<Radio value={PrimaryInterest.Mentor}>
														<T keyName="wantToBe.text">I want to be</T>{' '}
														<Text italic>
															<T keyName="wantToBe.mentor">Mentor</T>
														</Text>
													</Radio>
												</Space>
											</Radio.Group>
										)}
									</Form.Item>
								</Col>
							</Row>

							<Form.Item
								name="motivation"
								label={t(
									'form.motivation.label',
									'Your motivation. Why do you want to participate in game development or create your own?'
								)}
								wrapperCol={{ span: 24 }}
							>
								<Input.TextArea
									rows={4}
									placeholder={t(
										'form.motivation.placeholder',
										'Example: I want to be part of the creative team. What attracts me to game development...'
									)}
								/>
							</Form.Item>

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
						<Button type="primary" onClick={handleSave} loading={isUpdatingInterests}>
							<T keyName="saveAndContinue">Save and continue</T>
						</Button>
					</Space>
				</Space>
			</div>
		</div>
	)
}
