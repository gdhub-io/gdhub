import { Button, Card, Form, Input, message, Select } from 'antd'

const PreferencesProfileForm = ({ visible }: any) => {
	const [form] = Form.useForm()

	const handleForm = async () => {
		const values = await form.validateFields()

		message.success('Your profile has been updated')
	}

	const gameGenresOptions = [
		{ label: 'Шутер / shooter', value: 'shooter' },
		{ label: 'Шутер от первого лица / first person shooter(FPS)', value: 'first person shooter (FPS)' },
		{ label: 'Приключения / adventure', value: 'adventure' },
		{ label: 'Приключенческий боевик / action-adventure', value: 'action-adventure' },
		{ label: 'Стратегия в реальном времени / real time strategy (RTS)', value: 'real time strategy (RTS)' },
		{ label: 'Пошаговые стратегии / turn based strategy', value: 'turn based strategy' },
		{ label: 'Ролевые игры / role playing games (RPG)', value: 'role playing games (RPG)' },
		{
			label: 'Сногопользовательская ролевая онлайн игра / massively multiplayer online role playing game (MMORPG)',
			value: 'massively multiplayer online role playing game (MMORPG)',
		},
		{ label: 'Симуляторы / simulation', value: 'simulation' },
		{ label: 'Спортивные / sports', value: 'sports' },
		{ label: 'Танцевальные, ритмичные / dance/rhythm', value: 'dance/rhythm' },
		{ label: 'Пазлы / puzzle', value: 'puzzle' },
		{ label: 'Платформер / platformer', value: 'platformer' },
		{ label: 'Борьба, сражения / fighting', value: 'fighting' },
		{ label: 'Ужас выживания / survival horror', value: 'survival horror' },
		{ label: 'Другие / others', value: 'others' },
	]

	return (
		<Card title="Preferences" extra={<Button onClick={handleForm}>Save</Button>}>
			<Form
				form={form}
				layout="vertical"
				name="profile-preferences-form"
				wrapperCol={{ span: 24 }}
				onFinish={() => {}}
				onFinishFailed={() => {}}
				autoComplete="off"
				requiredMark="optional"
			>
				<Form.Item
					label="Preferred Game Genres"
					name="Preferred Genres"
					tooltip={{ title: 'Tooltip with customize icon' }}
					rules={[{ required: true }]}
				>
					<Select
						options={gameGenresOptions}
						mode="multiple"
						allowClear
						style={{ width: '100%' }}
						placeholder="Please select"
						onChange={() => {}}
					/>
				</Form.Item>
				<Form.Item label="Preferred Graphic Settings" name="Preferred Settings" rules={[{ required: true }]}>
					<Input />
				</Form.Item>
				<Form.Item label="Preferred Game Difficulty Levels" name="Preferred Difficulties" rules={[{ required: true }]}>
					<Input />
				</Form.Item>
			</Form>
		</Card>
	)
}

export default PreferencesProfileForm
