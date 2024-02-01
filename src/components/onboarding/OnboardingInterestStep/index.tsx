import { useMemo } from 'react'
import InterestAuthorIcon from '@/assets/images/icons/interest-author-icon.svg'
import InterestMentorIcon from '@/assets/images/icons/interest-mentor-icon.svg'
import InterestSpecialistIcon from '@/assets/images/icons/interest-specialist-icon.svg'
import { GameDifficultyLevel, GameGenre, GameSetting, PrimaryInterest } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Col, Flex, Form, Row, Segmented, Select, Space, Typography, message } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { PiWarningCircleLight } from 'react-icons/pi'
import styles from './style.module.scss'

interface IOnboardingInterestStep {
	onSave: () => void
	onPreviousStep: () => void
}

const { Paragraph, Title, Text } = Typography

export const OnboardingInterestStep = ({ onSave, onPreviousStep = () => {} }: IOnboardingInterestStep) => {
	const router = useRouter()
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
				return PrimaryInterest.Specialist
		}
	}, [router.query.for])

	useQuery(['profile', session?.user.id], () => axios.get<any>('/api/user/profile'), {
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

	const { mutateAsync: updateProfile } = useMutation(({ data }: any) => axios.put<any>('/api/user/profile', data))

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
													value: PrimaryInterest.Author,
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
													value: PrimaryInterest.Specialist,
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
													value: PrimaryInterest.Mentor,
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
					<Button onClick={onPreviousStep}>
						<T keyName="back">Back</T>
					</Button>
					<Button type="primary" onClick={handleSave}>
						<T keyName="saveAndContinue">Save and continue</T>
					</Button>
				</div>
			</div>
		</div>
	)
}
