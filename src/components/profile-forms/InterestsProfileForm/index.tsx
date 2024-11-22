import { useEffect, useState } from 'react'
import InterestAuthorIcon from '@/assets/images/icons/interest-author-icon.svg'
import InterestMentorIcon from '@/assets/images/icons/interest-mentor-icon.svg'
import InterestSpecialistIcon from '@/assets/images/icons/interest-specialist-icon.svg'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Form, Grid, Input, message, Radio, Segmented, Select, Space, Spin, Typography } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

type InterestsProfileFormArgs = {
	profile: prismaClient.Profile & {
		preferredGenres?: prismaClient.GameGenre[]
		preferredSettings?: prismaClient.GameSetting[]
		preferredLevels?: prismaClient.GameDifficultyLevel[]
	}
	saveProfile: (data: Partial<prismaClient.Profile>) => Promise<void>
}

const { Paragraph, Text } = Typography

const InterestsProfileForm = ({ profile, saveProfile }: InterestsProfileFormArgs) => {
	const [form] = Form.useForm()
	const { update: updateSession } = useSession()
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const [processing, setProcessing] = useState(true)
	const { data: gameGenres } = useQuery(
		['gameGenres'],
		() => axios.get<prismaClient.GameGenre[]>('/api/dictionary/game-genres'),
		{
			staleTime: Infinity,
		}
	)
	const { data: gameSettings } = useQuery(
		['gameSettings'],
		() => axios.get<prismaClient.GameSetting[]>('/api/dictionary/game-settings'),
		{ staleTime: Infinity }
	)
	const { data: gameLevels } = useQuery(
		['gameLevels'],
		() => axios.get<prismaClient.GameDifficultyLevel[]>('/api/dictionary/game-levels'),
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
			await updateSession({ user: { roles: [formData.primaryInterest] } })
			setProcessing(false)

			message.success(<T>Interests and preferences updated</T>)
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
		<Card title={t('Interests and preferences')} className={styles.content} bordered={false}>
			<Spin spinning={processing}>
				<Paragraph>
					<T keyName="interestsAndPreferencesDescription">
						This information will help us more accurately configure recommendations on projects, candidates for projects
						for you.
					</T>
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
						motivation: profile?.motivation,
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
										value: prismaClient.PrimaryInterest.Author,
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
										value: prismaClient.PrimaryInterest.Specialist,
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
										value: prismaClient.PrimaryInterest.Mentor,
									},
								]}
							/>
						)}

						{!screens.lg && (
							<Radio.Group>
								<Space direction="vertical">
									<Radio value={prismaClient.PrimaryInterest.Author}>
										<T keyName="wantToBe.text">I want to be</T>{' '}
										<Text italic>
											<T keyName="wantToBe.author">Author</T>
										</Text>
									</Radio>
									<Radio value={prismaClient.PrimaryInterest.Specialist}>
										<T keyName="wantToBe.text">I want to be</T>{' '}
										<Text italic>
											<T keyName="wantToBe.specialist">Specialist</T>
										</Text>
									</Radio>
									<Radio value={prismaClient.PrimaryInterest.Mentor}>
										<T keyName="wantToBe.text">I want to be</T>{' '}
										<Text italic>
											<T keyName="wantToBe.mentor">Mentor</T>
										</Text>
									</Radio>
								</Space>
							</Radio.Group>
						)}
					</Form.Item>
					<Form.Item
						label={
							<T keyName="profile-forms.interests.field.motivation.label">
								Your motivation for participation in projects or in their creation
							</T>
						}
						name="motivation"
					>
						<Input.TextArea rows={4} />
					</Form.Item>
					<Form.Item
						label={
							<T keyName="profile-forms.interests.field.preferredGenres.label">
								Games genres in the development of which you would be interested to participate
							</T>
						}
						name="preferredGenres"
					>
						<Select
							options={gameGenresOptions}
							mode="multiple"
							allowClear
							style={{ width: '100%' }}
							placeholder={t('Select')}
							onChange={() => {}}
						/>
					</Form.Item>
					<Form.Item
						label={t(
							'profile-forms.interests.field.preferredSettings.label',
							'Visual setting of projects with which you would be interested to work'
						)}
						name="preferredSettings"
					>
						<Select
							options={graphicSettingsOptions}
							mode="multiple"
							allowClear
							style={{ width: '100%' }}
							placeholder={t('Select')}
							onChange={() => {}}
						/>
					</Form.Item>
					<Form.Item
						label={t(
							'profile-forms.interests.field.preferredLevels.label',
							'What complexity games you would like to develop'
						)}
						name="preferredLevels"
					>
						<Select
							options={gameLevelsOptions}
							mode="multiple"
							allowClear
							style={{ width: '100%' }}
							placeholder={t('Select')}
							onChange={() => {}}
						/>
					</Form.Item>

					<Button type="primary" onClick={handleForm} loading={processing}>
						<T>Save</T>
					</Button>
				</Form>
			</Spin>
		</Card>
	)
}

export default InterestsProfileForm
