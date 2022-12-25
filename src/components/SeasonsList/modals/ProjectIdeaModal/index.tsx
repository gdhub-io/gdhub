import { useEffect, useState } from 'react'
import { normUploadFile } from '@helpers/file'
import { Button, Col, Form, Input, message, Modal, Popover, Row, Select, Spin, Upload, UploadProps } from 'antd'
import Image from 'next/image'
import { TbTrash } from 'react-icons/tb'
import styles from './style.module.less'

const ProjectIdeaModal = ({ seasonId, projectIdeaId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)
	const [projectIdea, setProjectIdea] = useState<any>()
	const [cover, setCover] = useState<string | null>()
	const [coverProcessing, setCoverProcessing] = useState(false)

	useEffect(() => {
		if (open && projectIdeaId) {
			setCover(undefined)
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

			if (data.hasOwnProperty('Cover Image')) {
				setCover(data['Cover Image'])
			}

			setProjectIdea({ ...data, 'Core Mechanics': data['Core Mechanics'].split('|'), 'Cover Image': undefined })

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
				body: JSON.stringify({
					id: projectIdeaId || null,
					data: { ...formData, 'Cover Image': cover ? cover : null },
				}),
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

	const uploadImage = async (file: any) => {
		try {
			const data = new FormData()
			data.append('file', file)
			data.append('filename', 'project-cover-' + projectIdeaId)
			data.append('tag', 'project-cover')

			const res = await fetch('/api/file/upload', {
				method: 'post',
				body: data,
			})

			return await res.json()
		} catch (error) {
			console.error(error)
		}
	}

	const removeImage = async (fileUrl: string) => {
		try {
			const res = await fetch('/api/file/delete', {
				method: 'post',
				body: JSON.stringify({ fileUrl }),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			return await res.json()
		} catch (error) {
			console.error(error)
		}
	}

	const uploadProps: UploadProps = {
		name: 'files',
		multiple: false,
		accept: 'image/png, image/jpeg',
		onChange: async (info) => {
			const { status } = info.file

			setCoverProcessing(true)

			if (status === 'done') {
				const uploadedFileData = await uploadImage(info.file.originFileObj)
				setCover(uploadedFileData.url)

				form.setFieldValue('Cover Image', uploadedFileData.url)

				message.success(`${info.file.name} file uploaded successfully.`)
			} else if (status === 'error') {
				message.error(`${info.file.name} file upload failed.`)
			}

			setCoverProcessing(false)
		},
		onDrop: async (e) => {
			setCoverProcessing(true)

			const uploadedFileData = await uploadImage(e.dataTransfer.files[0])
			setCover(uploadedFileData.url)
			setCoverProcessing(false)
		},
	}

	const handleCoverDelete = async () => {
		if (!cover) return

		setCoverProcessing(true)

		await removeImage(cover)

		setCover(undefined)
		setCoverProcessing(false)
		form.setFieldValue('Cover Image', undefined)
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

					<Spin spinning={coverProcessing}>
						{!cover ? (
							<Form.Item
								name="Cover Image"
								label="Обложка для проекта"
								valuePropName="fileList"
								getValueFromEvent={normUploadFile}
								noStyle
							>
								<Upload.Dragger {...uploadProps}>
									<p className="ant-upload-text">Добавить обложку проекта</p>
									<p className="ant-upload-hint">
										Для загрузки изображения нажмите или перетащите его в это поле.
										<br />
										Разрешаются файлы форматов jpg, png. Соотношение сторон 16/9. Например, размер 1920x1080px.
									</p>
								</Upload.Dragger>
							</Form.Item>
						) : (
							<div className={styles.cover}>
								<Image src={cover + '?w=750'} fill alt="" />
								<Popover content="Удалить обложку проекта">
									<Button shape="circle" type="primary" className="remove-cover-btn" onClick={handleCoverDelete}>
										<TbTrash size={18} style={{ marginTop: 2 }} />
									</Button>
								</Popover>
							</div>
						)}
					</Spin>

					<Row gutter={[16, 0]} align="middle" style={{ marginTop: 30 }}>
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
						label="Ссылка концепт-документ"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true, type: 'url' }]}
						required
					>
						<Input width={'100%'} disabled={projectIdea?.Status !== 'Registered'} />
					</Form.Item>

					{projectIdea?.Status == 'Approved' && (
						<>
							<Form.Item
								name="GDD Link"
								label="Ссылка на геймдизайн-документ"
								wrapperCol={{ span: 24 }}
								rules={[{ required: true, type: 'url' }]}
								required
							>
								<Input width={'100%'} />
							</Form.Item>
							<Form.Item
								name="Slides Link"
								label="Ссылка на презентацию (к питчу)"
								wrapperCol={{ span: 24 }}
								rules={[{ type: 'url' }]}
							>
								<Input width={'100%'} />
							</Form.Item>
						</>
					)}

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
