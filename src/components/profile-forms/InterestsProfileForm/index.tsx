import { useEffect, useState } from 'react'
import InterestAuthorIcon from '@/assets/images/icons/interest-author-icon.svg'
import InterestMentorIcon from '@/assets/images/icons/interest-mentor-icon.svg'
import InterestSpecialistIcon from '@/assets/images/icons/interest-specialist-icon.svg'
import { GameDifficultyLevel, GameGenre, GameSetting, PrimaryInterest, Profile } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Form, Grid, Input, message, Radio, Segmented, Select, Space, Spin, Typography } from 'antd'
import axios from 'axios'
import styles from './style.module.scss'

type InterestsProfileFormArgs = {
	profile: Profile & {
		preferredGenres?: GameGenre[]
		preferredSettings?: GameSetting[]
		preferredLevels?: GameDifficultyLevel[]
	}
	saveProfile: (data: Partial<Profile>) => Promise<void>
}

const { Paragraph, Text } = Typography

const InterestsProfileForm = ({ profile, saveProfile }: InterestsProfileFormArgs) => {
	const [form] = Form.useForm()
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const [processing, setProcessing] = useState(true)
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

	useEffect(() => {
		if (profile) {
			setProcessing(false)
		}
	}, [profile])

	const handleForm = async () => {
		try {
			const formData = await form.validateFields()

			setProcessing(true)
			await saveProfile(formData)
			setProcessing(false)

			message.success('Интересы и предпочтения обновлены')
		} catch (error: any) {
			setProcessing(false)
			message.error(error.message)
		}
	}

	const gameGenresOptions = gameGenres?.data.map((i) => ({
		label: (
			<Typography.Text ellipsis>
				<T>{i.name}</T>
			</Typography.Text>
		),
		value: i.id,
	}))

	const graphicSettingsOptions = gameSettings?.data.map((i) => ({
		label: (
			<Typography.Text ellipsis>
				<T>{i.name}</T>
			</Typography.Text>
		),
		value: i.id,
	}))

	const gameLevelsOptions = gameLevels?.data.map((i) => ({
		label: (
			<Typography.Text ellipsis>
				<T>{i.name}</T>
			</Typography.Text>
		),
		value: i.id,
	}))

	return (
		<Card title="Интересы и предпочтения" className={styles.content}>
			<Spin spinning={processing}>
				<Paragraph>
					Указанная информация поможет нам точнее настроить рекомендации по проектам, кандидатам на проекты для вас.
				</Paragraph>

				<Form
					form={form}
					layout="vertical"
					name="profile-preferences-form"
					wrapperCol={{ span: 24 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						primaryInterest: profile?.primaryInterest,
						preferredGenres: profile?.preferredGenres?.map((d) => d.id) || [],
						preferredSettings: profile?.preferredSettings?.map((d) => d.id) || [],
						preferredLevels: profile?.preferredLevels?.map((d) => d.id) || [],
					}}
				>
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
														<T keyName="wantToBe.text">I want to be</T>{' '}
														<Text italic>
															<T>Author</T>
														</Text>
													</Paragraph>
												</div>
												<div className="segmented-option-footer">
													<Text>
														<T keyName="wantToBe.author.description">I want to create my own games</T>
													</Text>
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
														<T keyName="wantToBe.text">I want to be</T>{' '}
														<Text italic>
															<T>Specialist</T>
														</Text>
													</Paragraph>
												</div>
												<div className="segmented-option-footer">
													<Text>
														<T keyName="wantToBe.specialist.description">I want to join the team</T>
													</Text>
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
														<T keyName="wantToBe.text">I want to be</T>{' '}
														<Text italic>
															<T>Mentor</T>
														</Text>
													</Paragraph>
												</div>
												<div className="segmented-option-footer">
													<Text>
														<T keyName="wantToBe.mentor.description">I want to share my expertise</T>
													</Text>
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
					<Form.Item label="Ваша мотивация участия в проектах или в их создании" name="motivation">
						<Input.TextArea rows={4} />
					</Form.Item>
					<Form.Item label="Жанры игр, в разработке которых вам интересно было бы участвовать" name="preferredGenres">
						<Select
							options={gameGenresOptions}
							mode="multiple"
							allowClear
							style={{ width: '100%' }}
							placeholder="Выберите"
							onChange={() => {}}
						/>
					</Form.Item>
					<Form.Item
						label="Визуальный сеттинг проектов, с которым вам было бы интересно поработать"
						name="preferredSettings"
					>
						<Select
							options={graphicSettingsOptions}
							mode="multiple"
							allowClear
							style={{ width: '100%' }}
							placeholder="Выберите"
							onChange={() => {}}
						/>
					</Form.Item>
					<Form.Item label="Игры какой сложности вам хотелось бы разрабатывать" name="preferredLevels">
						<Select
							options={gameLevelsOptions}
							mode="multiple"
							allowClear
							style={{ width: '100%' }}
							placeholder="Выберите"
							onChange={() => {}}
						/>
					</Form.Item>

					<Button type="primary" onClick={handleForm} loading={processing}>
						Сохранить
					</Button>
				</Form>
			</Spin>
		</Card>
	)
}

export default InterestsProfileForm
