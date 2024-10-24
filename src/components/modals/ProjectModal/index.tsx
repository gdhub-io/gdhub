import React from 'react'
import { useEffect, useRef, useState } from 'react'
import { normUploadFile } from '@/helpers/file'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { MDXEditorMethods } from '@mdxeditor/editor'
import { GoCheckCircleFill } from '@react-icons/all-files/go/GoCheckCircleFill'
import { TbTrash } from '@react-icons/all-files/tb/TbTrash'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import {
	Button,
	Col,
	Form,
	Input,
	message,
	Modal,
	notification,
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
import dynamic from 'next/dynamic'
import Image from 'next/image'
import styles from './style.module.scss'
import '@mdxeditor/editor/style.css'

type ProjectModalParams = {
	seasonId?: string
	projectId?: string
	open: boolean
	onOk: () => void
	onCancel: () => void
}

const ContentEditor = dynamic(() => import('@/components/ContentEditor'), { ssr: false })

const ProjectModal = ({ seasonId, projectId, open, onOk, onCancel }: ProjectModalParams) => {
	const { t } = useTolgee()
	const { token } = theme.useToken()
	const [form] = Form.useForm()
	const editorRef = useRef<MDXEditorMethods | null>()
	const [cover, setCover] = useState<string | null>()
	const [description, setDescription] = useState('')
	const [coverProcessing, setCoverProcessing] = useState(false)

	const { data: project, isFetching } = useQuery(
		['user-project', projectId],
		() =>
			axios.get<prismaClient.Project & { stage: prismaClient.SeasonStage }>('/api/user/project', {
				params: { projectId },
			}),
		{
			enabled: !!projectId && open,
			refetchOnWindowFocus: false,
			refetchInterval: false,
			onSuccess({ data }) {
				setCover(data.coverImage)
				setDescription(data.description || '')
			},
		}
	)

	console.log('projectId', projectId, isFetching)

	const { mutateAsync: createProject, isLoading: isCreating } = useMutation((data: any) =>
		axios.post<prismaClient.Project>('/api/user/project', data)
	)
	const { mutateAsync: updateProject, isLoading: isUpdating } = useMutation((data: any) =>
		axios.put<prismaClient.Project>('/api/user/project', data, { params: { id: projectId } })
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

			message.success(projectId ? <T>Project data updated</T> : <T>Added a new game project</T>)
			onOk()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error(<T keyName="modal.project.errorText">Error. Check if all data is entered correctly</T>)
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
			title={projectId ? <T>Change your project idea</T> : <T>Add your project idea</T>}
			width={900}
			destroyOnClose
			maskClosable={false}
			cancelText={<T>Close</T>}
			okText={<T>Save</T>}
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
								label={<T keyName="modal.project.coverImage.label">Cover for the project</T>}
								valuePropName="file"
								getValueFromEvent={normUploadFile}
								noStyle
							>
								<Upload.Dragger {...uploadProps}>
									<p className="ant-upload-text">
										<T keyName="modal.project.coverImage.text">Add a project cover</T>
									</p>
									<p className="ant-upload-hint">
										<T>To upload an image, click or drag it into this field.</T>
										<br />
										<T keyName="modal.project.coverImage.hint">
											Files in jpg, png formats are allowed. Aspect ratio 16/9. For example, the size is 1920x1080px.
										</T>
									</p>
								</Upload.Dragger>
							</Form.Item>
						) : (
							<div className={styles.cover}>
								<Image src={cover + '?w=750'} fill alt="" />
								<Popover content={t('modal.project.coverImage.deletePopover', 'Remove project cover')}>
									<Button
										shape="circle"
										type="primary"
										className="remove-cover-btn"
										onClick={handleCoverDelete}
										icon={<TbTrash size={18} style={{ marginTop: 2 }} />}
									/>
								</Popover>
							</div>
						)}
					</Spin>

					<Row gutter={[16, 0]} align="middle" style={{ marginTop: 30 }}>
						<Col flex={1} xs={{ span: 24 }} md={{ span: 16 }}>
							<Form.Item
								label={<T keyName="modal.project.name.label">Project Name</T>}
								name="name"
								rules={[{ required: true }]}
								required
								wrapperCol={{ span: 24 }}
							>
								<Input
									width={'100%'}
									placeholder={t('modal.project.name.placeholder', `Example: Hitman`)}
									size="large"
								/>
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 8 }}>
							<Form.Item
								name="platform"
								label={<T keyName="modal.project.platform.label">Platform</T>}
								wrapperCol={{ span: 24 }}
								rules={[{ required: true }]}
								required
							>
								<Input
									width={'100%'}
									placeholder={t('modal.project.platform.placeholder', 'Example: PC')}
									size="large"
								/>
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						name="description"
						label={<T keyName="modal.project.description.label">Short Description</T>}
						required
						rules={[
							{
								validator: () => {
									const value = editorRef.current?.getMarkdown()
									if (!value) {
										notification.error({
											message: <T keyName="form.error.required.text">This field is required</T>,
										})
									}
									return value ? Promise.resolve() : Promise.reject()
								},
							},
						]}
						wrapperCol={{ span: 24 }}
					>
						<ContentEditor
							editorRef={editorRef as any}
							markdown={description}
							onChange={(text: string) => form.setFieldValue('description', text)}
						/>
					</Form.Item>

					<Form.Item
						name="conceptLink"
						label={
							<Space>
								<T keyName="modal.project.conceptLink.label">Link to concept document (idea description)</T>
								{project?.data.status == prismaClient.ProjectStatus.Approved && (
									<Tooltip title="You can't change the link. It was approved already.">
										<GoCheckCircleFill color={token.colorSuccess} />
									</Tooltip>
								)}
							</Space>
						}
						wrapperCol={{ span: 24 }}
						rules={[{ type: 'url' }]}
					>
						<Input width={'100%'} disabled={project?.data.status == prismaClient.ProjectStatus.Approved} />
					</Form.Item>

					{project?.data.status == prismaClient.ProjectStatus.Approved && (
						<>
							<Form.Item
								name="gddLink"
								label={<T keyName="modal.project.gddLink.label">Link to game design document</T>}
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
										label={<T keyName="modal.project.pitchdeckLink.label">Link to presentation (to pitch)</T>}
										wrapperCol={{ span: 24 }}
										rules={[{ type: 'url' }]}
									>
										<Input width={'100%'} />
									</Form.Item>
								</Col>
								<Col md={{ span: 8 }} sm={{ span: 12 }} xs={{ span: 24 }}>
									<Form.Item
										name="videoLink"
										label={<T keyName="modal.project.videoLink.label">Pitch video</T>}
										wrapperCol={{ span: 24 }}
										rules={[{ max: 64, min: 4 }]}
									>
										<Input
											width={'100%'}
											placeholder={t('modal.project.videoLink.placeholder', 'Specify video ID: ECxL-7DWVSE')}
										/>
									</Form.Item>
								</Col>
							</Row>
						</>
					)}

					<Form.Item
						name="genre"
						label={<T keyName="modal.project.genre.label">Genre</T>}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Input
							width={'100%'}
							placeholder={t('modal.project.genre.placeholder', 'Example: arcade idle + tower defense')}
						/>
					</Form.Item>
					<Form.Item
						name="setting"
						label={<T keyName="modal.project.setting.label">Game Setting</T>}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Input
							width={'100%'}
							placeholder={t('modal.project.setting.placeholder', 'Example: post-apocalyptic/zombie')}
						/>
					</Form.Item>
					<Form.Item
						name="visualStyle"
						label={<T keyName="modal.project.visualStyle.label">Visual Style</T>}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Input
							width={'100%'}
							placeholder={t(
								'modal.project.visualStyle.placeholder',
								'Example: low poly or something reminiscent of brawlstars'
							)}
						/>
					</Form.Item>
					<Form.Item
						name="audition"
						label={<T keyName="modal.project.audition.label">Audition</T>}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Input width={'100%'} placeholder={t('modal.project.audition.placeholder', 'Example: men 16-45')} />
					</Form.Item>

					<Form.Item
						name="coreMechanics"
						label={<T keyName="modal.project.coreMechanics.label">Core Mechanics</T>}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
						extra={
							<T keyName="modal.project.coreMechanics.extra">
								Start typing. To enter a new mechanic, press Enter on your keyboard and enter text
							</T>
						}
					>
						<Select
							mode="tags"
							style={{ width: '100%' }}
							placeholder={t(
								'modal.project.coreMechanics.placeholder',
								'For example: run, climb cliffs, move through a portal'
							)}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default ProjectModal
