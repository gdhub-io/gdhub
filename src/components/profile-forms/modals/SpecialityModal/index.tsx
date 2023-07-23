import { useEffect, useState } from 'react'
import SkillBeginnerIcon from '@/assets/images/skills/beginner.svg'
import SkillExperiencedIcon from '@/assets/images/skills/experienced.svg'
import SkillExpertIcon from '@/assets/images/skills/expert.svg'
import SkillNoviceIcon from '@/assets/images/skills/novice.svg'
import SkillSkillfulIcon from '@/assets/images/skills/skillful.svg'
import { SkillLevel, WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Col, Form, Input, message, Modal, Row, Select, Spin, Tooltip } from 'antd'
import axios from 'axios'

export const skillLevelsList = [
	{
		index: 1,
		label: SkillLevel?.Novice,
		icon: <SkillNoviceIcon />,
		color: '#ffeb3b',
		description: 'Знаете как выполнить работу, но опыт еще нет',
	},
	{
		index: 2,
		label: SkillLevel?.Beginner,
		icon: <SkillBeginnerIcon />,
		color: '#FF9159',
		description: 'Знаете как выполнить работу, оределенный опыт уже есть',
	},
	{
		index: 3,
		label: SkillLevel?.Skillful,
		icon: <SkillSkillfulIcon />,
		color: '#F3B721',
		description:
			'Принимаете на себя ответвенность за выбор метода выполнения работы и можете приоритизировать работу по уровням важности',
	},
	{
		index: 4,
		label: SkillLevel?.Experienced,
		icon: <SkillExperiencedIcon />,
		color: '#80CC14',
		description: 'В работе используете интуицию, основанную на вашем опыте',
	},
	{
		index: 5,
		label: SkillLevel?.Expert,
		icon: <SkillExpertIcon />,
		color: '#25B869',
		description: 'Имеете огромную библиотеку различимых ситуаций(кейсов), построенную на основе вашего опыта',
	},
]

export const renderSkillLevel = (levelName: SkillLevel) => {
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

	const { data: workDirections } = useQuery(
		['workDirections'],
		() => axios.get<WorkDirection[]>('/api/dictionary/work-directions'),
		{
			staleTime: Infinity,
		}
	)

	const { mutateAsync: createSpeciality } = useMutation((variables: any) =>
		axios.post<void>('/api/user/speciality', variables)
	)
	const { mutateAsync: updateSpeciality } = useMutation((variables: any) =>
		axios.put<void>('/api/user/speciality', variables)
	)

	useEffect(() => {
		if (open) form.resetFields()

		if (speciality) {
			form.setFieldsValue({ ...speciality, tools: speciality.tools.split('\n') })
		}

		setProcessing(false)

		return () => form.resetFields()
	}, [open, speciality])

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()

			setProcessing(true)
			if (speciality) {
				await updateSpeciality({ id: speciality?.id || null, data: formData })
			} else {
				await createSpeciality({ data: formData })
			}

			setProcessing(false)

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

	const workDirectionOptions = workDirections?.data.map((direction) => ({ value: direction.id, label: direction.name }))

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
				>
					<Row gutter={[16, 16]}>
						<Col xs={{ span: 24 }} md={{ span: 16 }}>
							<Form.Item
								label="Название специальности"
								name="name"
								rules={[{ required: true }]}
								required
								wrapperCol={{ span: 24 }}
							>
								<Input width={'100%'} placeholder={`Пример: Концепт-художник по персонажам`} />
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 8 }}>
							<Form.Item name="level" label="Уровень владения" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
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
					<Form.Item
						name="workDirectionId"
						label="Направление деятельности"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
					>
						<Select style={{ width: '100%' }} placeholder={`Выберите`} options={workDirectionOptions} />
					</Form.Item>
					<Form.Item name="specialization" label="Специализация" wrapperCol={{ span: 24 }} rules={[{ required: true }]}>
						<Input.TextArea placeholder={`Пример: Реалистичные персонажи`} />
					</Form.Item>
					<Form.Item
						name="skills"
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
						name="portfolioUrl"
						label="Ссылка на портфолио/резюме"
						wrapperCol={{ span: 24 }}
						rules={[{ type: 'url' }]}
					>
						<Input />
					</Form.Item>
					<Form.Item
						name="tools"
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
						name="jobs"
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
						name="schools"
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
