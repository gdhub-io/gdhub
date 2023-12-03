import { useEffect, useState } from 'react'
import { normUploadFile } from '@/helpers/file'
import { Project, ProjectStatus, SeasonStage } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
	Button,
	Col,
	Form,
	Input,
	message,
	Modal,
	Popover,
	Row,
	Select,
	Space,
	Spin,
	theme,
	Tooltip,
	Upload,
	UploadProps,
} from 'antd'
import axios from 'axios'
import Image from 'next/image'
import { GoCheckCircleFill } from 'react-icons/go'
import { TbTrash } from 'react-icons/tb'
import styles from './style.module.scss'

type ProjectModalParams = {
	seasonId?: string
	projectId?: string
	open: boolean
	onOk: () => void
	onCancel: () => void
}

const ProjectModal = ({ seasonId, projectId, open, onOk, onCancel }: ProjectModalParams) => {
	const { token } = theme.useToken()
	const [form] = Form.useForm()
	const [cover, setCover] = useState<string | null>()
	const [coverProcessing, setCoverProcessing] = useState(false)

	const { data: project, isFetching } = useQuery(
		['user-project', projectId],
		() => axios.get<Project & { stage: SeasonStage }>('/api/user/project', { params: { projectId } }),
		{
			enabled: !!projectId && open,
			refetchOnWindowFocus: false,
			refetchInterval: false,
			onSuccess({ data }) {
				setCover(data.coverImage)
			},
		}
	)

	console.log('projectId', projectId, isFetching)

	const { mutateAsync: createProject, isLoading: isCreating } = useMutation((data: any) =>
		axios.post<Project>('/api/user/project', data)
	)
	const { mutateAsync: updateProject, isLoading: isUpdating } = useMutation((data: any) =>
		axios.put<Project>('/api/user/project', data, { params: { id: projectId } })
	)

	useEffect(() => {
		if (open && projectId) {
			setCover(undefined)
		}
	}, [open])

	useEffect(() => {
		if (project) {
			form.setFieldsValue({ ...project.data, seasonId: project?.data.stage.seasonId || seasonId })
		}
	}, [project])

	const handleOk = async () => {
		try {
			const formData = await form.validateFields()
			if (projectId) {
				await updateProject({ ...formData, coverImage: cover ? cover : null })
			} else {
				await createProject({ ...formData, seasonId, coverImage: cover ? cover : null })
			}

			message.success(projectId ? 'Данные проекта обновлены' : 'Добавлена новый проект игры')
			onOk()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error('Ошибка. Проверьте, все ли данные введены корректно')
			}
		}
	}

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	const uploadImage = async (file: any) => {
		try {
			const data = new FormData()
			data.append('file', file)
			data.append('filename', 'project-cover-' + projectId)
			data.append('tag', 'project-cover')

			const res = await axios.post('/api/file', data)

			return await res.data
		} catch (error) {
			console.error(error)
		}
	}

	const removeImage = async (fileUrl: string) => {
		try {
			const res = await axios.delete('/api/file', { params: { fileUrl } })

			// save
			if (projectId) {
				await updateProject({ coverImage: null })
			}

			return await res
		} catch (error) {
			console.error(error)
		}
	}

	const uploadProps: UploadProps = {
		name: 'files',
		multiple: false,
		accept: 'image/png, image/jpeg',
		customRequest: ({ onSuccess }) =>
			setTimeout(() => {
				if (onSuccess) onSuccess('ok')
			}, 0),
		onChange: async (info) => {
			const { status } = info.file

			setCoverProcessing(true)

			if (status === 'done') {
				const uploadedFileData = await uploadImage(info.file.originFileObj)
				setCover(uploadedFileData.url)

				form.setFieldValue('coverImage', uploadedFileData.url)

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
		setCoverProcessing(false)

		form.setFieldValue('coverImage', undefined)
		setCover(undefined)
	}

	return (
		<Modal
			centered
			title={projectId ? 'Изменить идею вашего проекта' : 'Добавить идею вашего проекта'}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText="Закрыть"
			okText="Сохранить"
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isCreating || isUpdating}
		>
			<Spin spinning={isFetching || isCreating || isUpdating}>
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
					<Spin spinning={coverProcessing}>
						{!cover ? (
							<Form.Item
								name="coverImage"
								label="Обложка для проекта"
								valuePropName="file"
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
								name="name"
								rules={[{ required: true }]}
								required
								wrapperCol={{ span: 24 }}
							>
								<Input width={'100%'} placeholder={`Пример: Hitman`} size="large" />
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 8 }}>
							<Form.Item
								name="platform"
								label="Платформа"
								wrapperCol={{ span: 24 }}
								rules={[{ required: true }]}
								required
							>
								<Input width={'100%'} placeholder={`Пример: PC`} size="large" />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item name="description" label="Краткое описание" rules={[{ required: true }]} wrapperCol={{ span: 24 }}>
						<Input.TextArea
							rows={6}
							placeholder={`Например:\nВ роли андроида по имени 2B игрок может путешествовать по открытому миру. Битвы с противниками проходят в реальном времени и персонажи используют оружие ближнего боя. У игрока есть основные и побочные квесты…`}
						/>
					</Form.Item>

					<Form.Item
						name="conceptLink"
						label={
							<Space>
								Ссылка на концепт-документ (описание идеи)
								{project?.data.status == ProjectStatus.Approved && (
									<Tooltip title="You can't change the link. It was approved already.">
										<GoCheckCircleFill color={token.colorSuccess} />
									</Tooltip>
								)}
							</Space>
						}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true, type: 'url' }]}
						required
					>
						<Input width={'100%'} disabled={project?.data.status == ProjectStatus.Approved} />
					</Form.Item>

					{project?.data.status == ProjectStatus.Approved && (
						<>
							<Form.Item
								name="gddLink"
								label="Ссылка на геймдизайн-документ"
								wrapperCol={{ span: 24 }}
								rules={[{ required: true, type: 'url' }]}
								required
							>
								<Input width={'100%'} />
							</Form.Item>
							<Row gutter={[16, 16]}>
								<Col md={{ span: 16 }} sm={{ span: 12 }} xs={{ span: 24 }}>
									<Form.Item
										name="pitchdeckLink"
										label="Ссылка на презентацию (к питчу)"
										wrapperCol={{ span: 24 }}
										rules={[{ type: 'url' }]}
									>
										<Input width={'100%'} />
									</Form.Item>
								</Col>
								<Col md={{ span: 8 }} sm={{ span: 12 }} xs={{ span: 24 }}>
									<Form.Item
										name="videoLink"
										label="Видео питча"
										wrapperCol={{ span: 24 }}
										rules={[{ max: 64, min: 4 }]}
									>
										<Input width={'100%'} placeholder="Укажите ID видео: ECxL-7DWVSE" />
									</Form.Item>
								</Col>
							</Row>
						</>
					)}

					<Form.Item name="genre" label="Жанр" wrapperCol={{ span: 24 }} rules={[{ required: true }]} required>
						<Input width={'100%'} placeholder={`Пример: аркадный айдлер + tower defence`} />
					</Form.Item>
					<Form.Item name="setting" label="Сеттинг" wrapperCol={{ span: 24 }} rules={[{ required: true }]} required>
						<Input width={'100%'} placeholder={`Пример: постапокалипсис/зомби`} />
					</Form.Item>
					<Form.Item
						name="visualStyle"
						label="Визуальный стиль"
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Input width={'100%'} placeholder={`Пример: лоу-поли или что-то напоминающее brawlstars`} />
					</Form.Item>
					<Form.Item name="audition" label="Аудитория" wrapperCol={{ span: 24 }} rules={[{ required: true }]} required>
						<Input width={'100%'} placeholder={`Пример: мужчины 16-45`} />
					</Form.Item>

					<Form.Item
						name="coreMechanics"
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

export default ProjectModal
