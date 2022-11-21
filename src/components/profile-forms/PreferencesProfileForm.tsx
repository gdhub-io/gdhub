import { useEffect, useState } from 'react'
import { Button, Card, Form, message, Select, Spin, Typography } from 'antd'

const PreferencesProfileForm = ({ profile }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)

	useEffect(() => {
		if (profile) {
			setProcessing(false)
		}
	}, [profile])

	const handleForm = async () => {
		try {
			const formData = await form.validateFields()

			setProcessing(true)

			const response: any = await fetch('/api/profile/update', {
				method: 'post',
				body: JSON.stringify({ id: profile.id, data: formData }),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			setProcessing(false)

			if (response.error) {
				throw new Error(response.error.message)
			}

			message.success('Предпочтения по играм обновлены')
		} catch (error: any) {
			setProcessing(false)
			message.error(error.message)
		}
	}

	const gameGenresOptions = [
		'Шутер / shooter',
		'Шутер от первого лица / first person shooter(FPS)',
		'Приключения / adventure',
		'Приключенческий боевик / action-adventure',
		'Стратегия в реальном времени / real time strategy (RTS)',
		'Пошаговые стратегии / turn based strategy',
		'Ролевые игры / role playing games (RPG)',
		'Многопользовательская ролевая онлайн игра / massively multiplayer online role playing game (MMORPG)',
		'Симуляторы / simulation',
		'Спортивные / sports',
		'Танцевальные, ритмичные / dance/rhythm',
		'Пазлы / puzzle',
		'Платформер / platformer',
		'Борьба, сражения / fighting',
		'Ужас выживания / survival horror',
		'Другие / others',
	].map((i) => ({ label: <Typography.Paragraph ellipsis>{i}</Typography.Paragraph>, value: i }))

	const graphicSettingsOptions = [
		'Исторический / Historic',
		'Научная фантастика / Sci-Fi',
		'Зомби / Zombie',
		'Военный / Military',
		'Сказочный / Fairy',
		'Азиатская фэнтэзи / Oriental Fantasy',
		'Спортивный / Sport',
		'Реальная жизнь / Real Life',
		'Фэнтэзи / Fantasy',
		'Другое / Other',
	].map((i) => ({ label: <Typography.Paragraph ellipsis>{i}</Typography.Paragraph>, value: i }))

	const gameLevelsOptions = [
		'Гиперказуальные / Hyper-casual',
		'Казуальные / Casual',
		'Средней сложности / Mid-core',
		'Сложные / Hard-core',
		'Другое / Other',
	].map((i) => ({ label: <Typography.Paragraph ellipsis>{i}</Typography.Paragraph>, value: i }))

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
						'Preferred Genres': profile?.hasOwnProperty('Preferred Genres') ? profile['Preferred Genres'] : [],
						'Preferred Settings': profile?.hasOwnProperty('Preferred Settings') ? profile['Preferred Settings'] : [],
						'Preferred Difficulty Levels': profile?.hasOwnProperty('Preferred Difficulty Levels')
							? profile['Preferred Difficulty Levels']
							: [],
					}}
				>
					<Form.Item label="Жанры игр, в разработке которых вам интересно было бы участвовать" name="Preferred Genres">
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
						name="Preferred Settings"
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
					<Form.Item label="Игры какой сложности вам хотелось бы разрабатывать" name="Preferred Difficulty Levels">
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
