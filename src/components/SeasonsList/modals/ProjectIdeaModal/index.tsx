import { useEffect, useState } from 'react'
import { Col, Form, Input, message, Modal, Row, Select, Spin } from 'antd'

const ProjectIdeaModal = ({ seasonId, projectIdeaId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)
	const [projectIdea, setProjectIdea] = useState<any>()

	useEffect(() => {
		if (open && projectIdeaId) {
			getProjectIdea(projectIdeaId)
		} else {
			setProcessing(false)
		}
	}, [open])

	useEffect(() => {
		if (projectIdea) {
			form.setFieldsValue({ ...projectIdea, Season: projectIdea.Season[0] })
		}
	}, [projectIdea])

	const getProjectIdea = async (projectIdeaId: string) => {
		try {
			setProcessing(true)

			const response: any = await fetch('/api/project/idea', {
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: projectIdeaId,
				}),
			})

			if (response.error) {
				throw new Error(response.error.message)
			}

			const data = await response.json()

			setProjectIdea({ ...data, 'Core Mechanics': data['Core Mechanics'].split('|') })
			setProcessing(false)
		} catch (error: any) {
			console.log('getProjectIdea', error)
			message.error(error.message)
			setProcessing(false)
		}
	}

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()
			setProcessing(true)
			const response: any = await fetch('/api/project/idea/save', {
				method: 'post',
				body: JSON.stringify({ id: projectIdeaId || null, data: formData }),
				headers: {
					'Content-Type': 'application/json',
				},
			})
			setProcessing(false)

			if (!response.ok) {
				throw new Error('Something wrong')
			}

			const data = await response.json()

			if (data.error) {
				throw new Error(response.error.message)
			}

			message.success(projectIdeaId ? 'Данные идеи обновлены' : 'Добавлена новая идея игры')
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

	const handleCancel = () => {
		setProjectIdea(null)
		form.resetFields()
		onCancel()
	}

	return (
		<Modal
			centered
			title={projectIdeaId ? 'Изменить идею вашего проекта' : 'Добавить идею вашего проекта'}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText="Закрыть"
			okText="Сохранить"
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
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
					initialValues={{
						Season: seasonId,
					}}
				>
					<Form.Item name="Season" noStyle hidden>
						<Input />
					</Form.Item>

					<Row gutter={[16, 0]} align="middle">
						<Col flex={1} xs={{ span: 24 }} md={{ span: 16 }}>
							<Form.Item
								label="Название проекта"
								name="Name"
								rules={[{ required: true }]}
								required
								wrapperCol={{ span: 24 }}
							>
								<Input width={'100%'} placeholder={`Пример: Hitman`} size="large" />
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 8 }}>
							<Form.Item
								name="Platform"
								label="Платформа"
								wrapperCol={{ span: 24 }}
								rules={[{ required: true }]}
								required
							>
								<Input width={'100%'} placeholder={`Пример: PC`} size="large" />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item name="Description" label="Краткое описание" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
						<Input.TextArea
							rows={6}
							placeholder={`Например:\nВ роли андроида по имени 2B игрок может путешествовать по открытому миру. Битвы с противниками проходят в реальном времени и персонажи используют оружие ближнего боя. У игрока есть основные и побочные квесты…`}
						/>
					</Form.Item>

					<Form.Item
						name="Document Link"
						label="Ссылка на документ с исследованием идеи"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true, type: 'url' }]}
						required
					>
						<Input width={'100%'} />
					</Form.Item>

					<Form.Item name="Genre" label="Жанр" wrapperCol={{ span: 24 }} rules={[{ required: true }]} required>
						<Input width={'100%'} placeholder={`Пример: аркадный айдлер + tower defence`} />
					</Form.Item>
					<Form.Item name="Setting" label="Сеттинг" wrapperCol={{ span: 24 }} rules={[{ required: true }]} required>
						<Input width={'100%'} placeholder={`Пример: постапокалипсис/зомби`} />
					</Form.Item>
					<Form.Item
						name="Visual Style"
						label="Визуальный стиль"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Input width={'100%'} placeholder={`Пример: лоу-поли или что-то напоминающее brawlstars`} />
					</Form.Item>
					<Form.Item name="Audition" label="Аудитория" wrapperCol={{ span: 24 }} rules={[{ required: true }]} required>
						<Input width={'100%'} placeholder={`Пример: мужчины 16-45`} />
					</Form.Item>

					<Form.Item
						name="Core Mechanics"
						label="Core-механики"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
						extra={'Начните вводить текст. Для ввода новой механики нажмите Enter на клавиатуре и вводите текст'}
					>
						<Select
							mode="tags"
							style={{ width: '100%' }}
							placeholder={`Например: бежать, карабкаться по обрывам, перемещаться через портал`}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default ProjectIdeaModal
