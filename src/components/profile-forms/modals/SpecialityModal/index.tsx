import { useEffect, useMemo, useState } from 'react'
import { skillLevelsList } from '@/components/ui/skillLevel'
import { WorkDirection } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
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
	const { t } = useTolgee()
	const router = useRouter()
	const { data: session } = useSession()
	const [processing, setProcessing] = useState(true)
	const [showParseCVButton, setShowParseCVButton] = useState(false)
	const [isParsing, setIsParsing] = useState(false)
	const [jobPosition, setJobPosition] = useState<string>('')

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

			message.success(
				speciality ? (
					<T keyName="modal.speciality.update.success">Data on the specialty updated</T>
				) : (
					<T keyName="modal.speciality.create.success">Added a new specialty</T>
				)
			)
			onOk()
		} catch (error: any) {
			setProcessing(false)

			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error(
					<T keyName="modal.speciality.create-update.error">Error. Check if all the data is entered correctly </T>
				)
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
			data: { jobPosition, locale: router.locale },
			maxCount: 1,
			onChange: ({ file }) => {
				if (file.status === 'done' && (!file.response || file.response.success == false)) {
					setIsParsing(false)
					message.error(t('uploadcv-error-message', `We couldn't process your file. Enter data manually`))
					return
				}

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
		[form, jobPosition]
	)

	const handleJobPositionChange = (value: string) => {
		setShowParseCVButton(!!value)
		setJobPosition(value)
	}

	return (
		<Modal
			title={
				speciality ? (
					<T key="modal.speciality.title.update">Change the specialty</T>
				) : (
					<T key="modal.speciality.title.create">Add specialty</T>
				)
			}
			width={800}
			destroyOnClose
			maskClosable={false}
			cancelText={<T>Close</T>}
			okText={<T>Save</T>}
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
								label={<T keyName="modal.speciality.form.name.label">Name of specialty</T>}
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
									placeholder={t('modal.speciality.form.name.placeholder', `Example: Character Concept Artist`)}
									onChange={(e) => handleJobPositionChange(e.target.value)}
								/>
							</Form.Item>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 8 }}>
							<Form.Item
								name="level"
								label={<T keyName="modal.speciality.form.level.label">Level of ownership</T>}
								rules={[{ required: true }]}
								wrapperCol={{ span: 24 }}
							>
								<Select
									options={levelOptions}
									placeholder={t('modal.speciality.form.level.placeholder', 'Select')}
									style={{ width: '100%' }}
								/>
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						name="summary"
						label={<T keyName="modal.speciality.form.summary.label">Briefly about what you are doing</T>}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea rows={3} />
					</Form.Item>

					<Form.Item
						name="workDirectionId"
						label={<T keyName="modal.speciality.form.workDirectionId.label">Direction of activity</T>}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
					>
						<Select
							style={{ width: '100%' }}
							placeholder={t('modal.speciality.form.workDirectionId.placeholder', `Choose`)}
							options={workDirectionOptions}
						/>
					</Form.Item>
					<Form.Item
						name="specialization"
						label={<T keyName="modal.speciality.form.specialization.label">Specialization</T>}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
					>
						<Input.TextArea
							placeholder={t('modal.speciality.form.specialization.placeholder', `Example: Realistic characters`)}
						/>
					</Form.Item>
					<Form.Item
						name="skills"
						label={<T keyName="modal.speciality.form.skills.label">List of skills</T>}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
						extra={
							<T keyName="modal.speciality.form.skills.extra">
								Write each skill from a new line.Indicate in the format: verb + definition
							</T>
						}
					>
						<Input.TextArea rows={6} />
					</Form.Item>
					<Form.Item
						name="portfolioUrl"
						label={<T keyName="modal.speciality.form.portfolioUrl.label">Link to portfolio/resume</T>}
						wrapperCol={{ span: 24 }}
						rules={[{ type: 'url' }]}
					>
						<Input />
					</Form.Item>
					<Form.Item
						name="tools"
						label={<T keyName="modal.speciality.form.tools.label">Tools</T>}
						wrapperCol={{ span: 24 }}
						extra={
							<T keyName="modal.speciality.form.tools.extra">
								Indicate which tools/software/services you use in your work
							</T>
						}
					>
						<Select
							mode="tags"
							style={{ width: '100%' }}
							placeholder={t(
								'modal.speciality.form.tags.placeholder',
								`Example: Photoshop, Google Docs, Unity, VS Code`
							)}
						/>
					</Form.Item>
					<Form.Item
						name="jobs"
						label={<T keyName="modal.speciality.form.jobs.label">Where did you work?</T>}
						wrapperCol={{ span: 24 }}
						extra={
							<T keyName="modal.speciality.form.jobs.extra">
								Write the work from a new line.Indicate in the format: Dates of work, place of work, position
							</T>
						}
					>
						<Input.TextArea
							rows={6}
							placeholder={t(
								'modal.speciality.form.jobs.placeholder',
								`Example:\n2015-2020, LLC "Gamboka", Unity developer\n2020-to-date, LLC "Lukomorye", Sound designer`
							)}
						/>
					</Form.Item>
					<Form.Item
						name="schools"
						label={<T keyName="modal.speciality.form.schools.label">Where did you study?</T>}
						wrapperCol={{ span: 24 }}
						extra={
							<T keyName="modal.speciality.form.schools.extra">
								Write each place of training from a new line.Indicate in the format: training period, place of study,
								name/specialty name
							</T>
						}
					>
						<Input.TextArea
							rows={6}
							placeholder={t(
								'modal.speciality.form.schools.placeholder',
								`Example:\n2000-2010, High school №145\n2011, The course on UDEMY "How to become a tester"`
							)}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default SpecialityModal
