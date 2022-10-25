import { useEffect, useState } from 'react'
import SkillBeginnerIcon from '@assets/images/skills/beginner.svg'
import SkillExperiencedIcon from '@assets/images/skills/experienced.svg'
import SkillExpertIcon from '@assets/images/skills/expert.svg'
import SkillNoviceIcon from '@assets/images/skills/novice.svg'
import SkillSkillfulIcon from '@assets/images/skills/skillful.svg'
import { Col, Form, Input, message, Modal, Row, Select, Spin, Tooltip } from 'antd'

export enum SkillLevelEnum {
	NOVICE = 'Новичок / Novice',
	BEGINNER = 'Начинающий / Beginner',
	SKILLFUL = 'Умеющий / Skillful',
	EXPERIENCED = 'Опытный / Experienced',
	EXPERT = 'Эксперт / Expert',
}

export const skillLevelsList = [
	{
		index: 1,
		label: SkillLevelEnum.NOVICE,
		icon: <SkillNoviceIcon />,
		color: '#ffeb3b',
		description: 'Знаете как выполнить работу, но опыт еще нет',
	},
	{
		index: 2,
		label: SkillLevelEnum.BEGINNER,
		icon: <SkillBeginnerIcon />,
		color: '#FF9159',
		description: 'Знаете как выполнить работу, оределенный опыт уже есть',
	},
	{
		index: 3,
		label: SkillLevelEnum.SKILLFUL,
		icon: <SkillSkillfulIcon />,
		color: '#F3B721',
		description:
			'Принимаете на себя ответвенность за выбор метода выполнения работы и можете приоритизировать работу по уровням важности',
	},
	{
		index: 4,
		label: SkillLevelEnum.EXPERIENCED,
		icon: <SkillExperiencedIcon />,
		color: '#80CC14',
		description: 'В работе используете интуицию, основанную на вашем опыте',
	},
	{
		index: 5,
		label: SkillLevelEnum.EXPERT,
		icon: <SkillExpertIcon />,
		color: '#25B869',
		description: 'Имеете огромную библиотеку различимых ситуаций(кейсов), построенную на основе вашего опыта',
	},
]

export const renderSkillLevel = (levelName: SkillLevelEnum) => {
	const level = skillLevelsList.find((i) => i.label == levelName)
	return (
		<Tooltip title={level?.description}>
			{level?.icon} {level?.label}
		</Tooltip>
	)
}

const SpecialityModal = ({ speciality, profileId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)

	useEffect(() => {
		if (open) form.resetFields()

		if (speciality) {
			form.setFieldsValue(speciality.fields)
		}

		return () => form.resetFields()
	}, [open, speciality])

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()
			setProcessing(true)
			const response: any = await fetch('/api/profile/speciality/save', {
				method: 'post',
				body: JSON.stringify({ id: speciality?.id || null, profileId, data: formData }),
				headers: {
					'Content-Type': 'application/json',
				},
			})
			setProcessing(false)
			if (response.error) {
				throw new Error(response.error.message)
			}
			message.success(speciality ? 'Данные о специальности обновлены' : 'Добавлена новая специальность')
			onOk()
		} catch (error: any) {
			setProcessing(false)

			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error('Ошибка. Проверьте, все ли данные введены корректно')
			}
		}
	}

	return (
		<Modal
			title={speciality ? 'Изменить специальность' : 'Добавить специальность'}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText="Закрыть"
			okText="Сохранить"
			open={open}
			onOk={handleOk}
			onCancel={onCancel}
			confirmLoading={processing}
		>
			<Spin spinning={processing}>
				<Form
					form={form}
					layout="vertical"
					name="profile-speciality-form"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{ profileId }}
				>
					<Row>
						<Col xs={{ span: 24 }} md={{ span: 12 }}>
							<Form.Item
								label="Название специальности"
								name="Name"
								rules={[{ required: true }]}
								required
								wrapperCol={{ span: 24 }}
							>
								<Input width={'100%'} placeholder={`Пример: Концепт-художник по персонажам`} />
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 8, offset: 4 }}>
							<Form.Item name="Level" label="Уровень владения" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<Select placeholder="Выберите" style={{ width: '100%' }}>
									{skillLevelsList.map((item: any, indx: number) => (
										<Select.Option key={indx.toString()} value={item.label}>
											{item.label !== form.getFieldValue('Level') ? (
												<Tooltip title={item.description} placement="right">
													{item.icon} {item.label}
												</Tooltip>
											) : (
												<>
													{item.icon} {item.label}
												</>
											)}
										</Select.Option>
									))}
								</Select>
							</Form.Item>
						</Col>
					</Row>
					<Form.Item name="Specialization" label="Специализация" wrapperCol={{ span: 24 }}>
						<Input.TextArea placeholder={`Пример: Реалистичные персонажи`} />
					</Form.Item>
					<Form.Item
						name="Skills"
						label="Список навыков"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
						extra="Каждый навык пишите c новой строки. Указывайте в формате: глагол + определение"
					>
						<Input.TextArea
							rows={6}
							placeholder={`Например:\nрисовать концепты мультяшных персонажей\nразрабатывать диалоговые системы`}
						/>
					</Form.Item>
					<Form.Item
						name="Tools"
						label="Инструменты"
						wrapperCol={{ span: 24 }}
						extra="Укажите какие инструменты/софт/сервисы используете в работе"
					>
						<Select
							mode="tags"
							style={{ width: '100%' }}
							placeholder={`Пример: Photoshop, Google Docs, Unity, VS Code`}
						/>
					</Form.Item>
					<Form.Item
						name="Workplaces"
						label="Где работали?"
						wrapperCol={{ span: 24 }}
						extra="Каждое место работы пишите c новой строки. Указывайте в формате: даты работы, место работы, должность"
					>
						<Input.TextArea
							rows={6}
							placeholder={`Например:\n2015-2020, ООО "ГеймБука", Unity-разработчик\n2020-настоящее время, ООО "Лукоморье", Sound-дизайнер`}
						/>
					</Form.Item>
					<Form.Item
						name="Schools"
						label="Где учились?"
						wrapperCol={{ span: 24 }}
						extra="Каждое место обучения пишите c новой строки. Указывайте в формате: период обучения, место учебы, название курса/специальности"
					>
						<Input.TextArea
							rows={6}
							placeholder={`Например:\n2000-2010, Гимназия №145\n2011, Курс на Udemy "Как стать тестировщиком"`}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default SpecialityModal
