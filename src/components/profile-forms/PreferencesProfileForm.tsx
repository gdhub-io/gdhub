import { useEffect, useState } from 'react'
import { GameDifficultyLevel, GameGenre, GameSetting, Profile } from '@prisma/client'
import { Button, Card, Form, message, Select, Spin, Typography } from 'antd'
import axios from 'axios'
import { useQuery } from 'react-query'

type PreferencesProfileFormArgs = {
	profile: Profile & {
		preferredGenres?: GameGenre[]
		preferredSettings?: GameSetting[]
		preferredLevels?: GameDifficultyLevel[]
	}
	saveProfile: (data: { id: string; data: Partial<Profile> }) => Promise<void>
}

const PreferencesProfileForm = ({ profile, saveProfile }: PreferencesProfileFormArgs) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)

	const { data: gameGenres } = useQuery('gameGenres', () => axios.get<GameGenre[]>('/api/dictionary/game-genres'))
	const { data: gameSettings } = useQuery('gameSettings', () =>
		axios.get<GameSetting[]>('/api/dictionary/game-settings')
	)
	const { data: gameLevels } = useQuery('gameLevels', () => axios.get<GameSetting[]>('/api/dictionary/game-levels'))

	useEffect(() => {
		if (profile) {
			setProcessing(false)
		}
	}, [profile])

	const handleForm = async () => {
		try {
			const formData = await form.validateFields()

			setProcessing(true)
			await saveProfile({ id: profile.id, data: formData })
			setProcessing(false)

			message.success('Предпочтения по играм обновлены')
		} catch (error: any) {
			setProcessing(false)
			message.error(error.message)
		}
	}

	const gameGenresOptions = gameGenres?.data.map((i) => ({
		label: <Typography.Paragraph ellipsis>{i.name}</Typography.Paragraph>,
		value: i.id,
	}))

	const graphicSettingsOptions = gameSettings?.data.map((i) => ({
		label: <Typography.Paragraph ellipsis>{i.name}</Typography.Paragraph>,
		value: i.id,
	}))

	const gameLevelsOptions = gameLevels?.data.map((i) => ({
		label: <Typography.Paragraph ellipsis>{i.name}</Typography.Paragraph>,
		value: i.id,
	}))

	return (
		<Card title="Предпочтения">
			<Spin spinning={processing}>
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
						preferredGenres: profile?.preferredGenres?.map((d) => d.id) || [],
						preferredSettings: profile?.preferredSettings?.map((d) => d.id) || [],
						preferredLevels: profile?.preferredLevels?.map((d) => d.id) || [],
					}}
				>
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
					<Button type="primary" onClick={handleForm}>
						Сохранить
					</Button>
				</Form>
			</Spin>
		</Card>
	)
}

export default PreferencesProfileForm
