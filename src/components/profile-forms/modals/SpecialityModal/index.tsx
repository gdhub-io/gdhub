import { useEffect, useMemo, useState } from 'react'
import { skillLevelsList } from '@/components/ui/skillLevel'
import { WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import {
	Button,
	Col,
	Form,
	Input,
	message,
	Modal,
	Row,
	Select,
	Space,
	Spin,
	Tooltip,
	Typography,
	Upload,
	UploadProps,
} from 'antd'
import { DefaultOptionType } from 'antd/es/select'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

const { Text } = Typography

const SpecialityModal = ({ speciality, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const router = useRouter()
	const { data: session } = useSession()
	const [processing, setProcessing] = useState(true)
	const [showParseCVButton, setShowParseCVButton] = useState(false)
	const [isParsing, setIsParsing] = useState(false)

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
			form.setFieldsValue({ ...speciality, tools: speciality.tools?.split('\n') })
		}

		setProcessing(false)

		const existNameValue = !!form.getFieldValue('name')
		setShowParseCVButton(existNameValue)

		return () => form.resetFields()
	}, [open, speciality])

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()

			setProcessing(true)
			if (speciality) {
				await updateSpeciality({ id: speciality?.id || null, data: { ...formData, tools: formData.tools.join('\n') } })
			} else {
				await createSpeciality({ data: { ...formData, tools: formData.tools.join('\n') } })
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

	const fillForm = (data: any) => {
		const { workAreaId, tools, summary, specialization, skills, experience, education, portfolioLink } = data

		if (workAreaId)
			form.setFieldsValue({
				summary,
				workDirectionId: workAreaId,
				specialization,
				skills: skills?.join('\n'),
				tools,
				portfolioUrl: portfolioLink,
				jobs: experience?.map((job: any) => `${job.from} - ${job.to}, ${job.roleName}, ${job.companyName}`).join('\n'),
				schools: education
					?.map(
						(school: any) => `${school.from} - ${school.to}, ${school.speciality}, ${school.degree}, ${school.school}`
					)
					.join('\n'),
			})
	}

	const levelOptions: DefaultOptionType[] = useMemo(
		() =>
			skillLevelsList.map((item: any, indx: number) => {
				console.log(item)
				return {
					value: item.value,
					label:
						item.label !== form.getFieldValue('Level') ? (
							<Tooltip title={item.description} placement="right">
								{item.icon} {item.label}
							</Tooltip>
						) : (
							<>
								{item.icon} {item.label}
							</>
						),
				}
			}),
		[skillLevelsList, form]
	)

	const uploadProps: UploadProps = useMemo(
		() => ({
			name: 'file',
			accept: '.pdf',
			action: '/api/user/parse/cv',
			showUploadList: false,
			data: { jobPosition: form.getFieldValue('name'), locale: router.locale },
			maxCount: 1,
			onChange: ({ file }) => {
				if (file.status == 'uploading') {
					setIsParsing(true)
				}

				if (file.status == 'error') {
					message.error(file.error)
					setIsParsing(false)
				}

				if (file.status === 'done') {
					fillForm(file.response)
					setIsParsing(false)
				}
			},
		}),
		[form]
	)

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
								extra={
									showParseCVButton &&
									!!session?.user.activeSubscription && (
										<Space style={{ marginTop: 4 }}>
											<Text>
												<T>Fill in from CV/resume</T>
											</Text>
											<Upload {...uploadProps} disabled={isParsing}>
												<Button size="small" disabled={isParsing} loading={isParsing}>
													<T>Upload PDF</T>
												</Button>
											</Upload>
										</Space>
									)
								}
							>
								<Input
									width={'100%'}
									placeholder={`Пример: Концепт-художник по персонажам`}
									onChange={(e) => setShowParseCVButton(!!e.target.value)}
								/>
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 8 }}>
							<Form.Item name="level" label="Уровень владения" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
								<Select options={levelOptions} placeholder="Выберите" style={{ width: '100%' }} />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item name="summary" label="Кратко о том, чем занимаетесь" wrapperCol={{ span: 24 }}>
						<Input.TextArea rows={3} />
					</Form.Item>

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
