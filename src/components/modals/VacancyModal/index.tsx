import { useEffect, useState } from 'react'
import { useWorkDirections } from '@/hooks/library'
import { DeleteOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { MdOutlineHandshake } from '@react-icons/all-files/md/MdOutlineHandshake'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import {
	Button,
	Col,
	DatePicker,
	Form,
	Input,
	message,
	Modal,
	Row,
	Select,
	Space,
	Spin,
	InputNumber,
	Card,
	Popconfirm,
} from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import styles from './style.module.scss'

interface VacancyModalProps {
	teamId?: string
	projectId?: string
	vacancyId?: string
	open: boolean
	onOk: () => void
	onCancel: () => void
}

const VacancyModal = ({ teamId, projectId, vacancyId, open, onOk, onCancel }: VacancyModalProps) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const { options: directionsOptions } = useWorkDirections()
	const [showPromiseFields, setShowPromiseFields] = useState(false)

	const {
		data: vacancy,
		refetch: fetchVacancy,
		isFetching: isLoadingVacancy,
	} = useQuery(
		['vacancy', vacancyId],
		() => axios.get<prismaClient.TeamVacancy>('/api/user/project/vacancy', { params: { id: vacancyId } }),
		{
			enabled: !!vacancyId,
			staleTime: Infinity,
			onSuccess: ({ data }) => {
				form.setFieldsValue({
					...data,
					finishedAt: dayjs(data.finishedAt),
					showPromiseFields: !!data.promisePercentage,
				})
				setShowPromiseFields(!!data.promisePercentage)
			},
		}
	)

	const { data: workflowData, isLoading: isLoadingWorkflow } = useQuery(
		['project-workflow', projectId],
		() => axios.get('/api/user/project/workflow', { params: { projectId } }),
		{
			enabled: !!projectId,
		}
	)

	const { data: projectEquity } = useQuery(
		['project-equity', projectId],
		() => axios.get('/api/user/project/equity', { params: { projectId } }),
		{
			enabled: !!projectId,
		}
	)

	const getMaxAvailableShare = () => {
		if (!projectEquity?.data) return 0

		const teamTotal = projectEquity.data.equityAllocations?.reduce(
			(sum: number, share: any) =>
				sum + share.percentage + share.promises.reduce((acc: number, promise: any) => acc + promise.percentage, 0),
			0
		)
		const allocated =
			projectEquity.data.platformShare +
			projectEquity.data.mentorFundShare +
			projectEquity.data.investmentReserve +
			(teamTotal || 0)

		const remainingPercentage = 100 - allocated

		return Math.min(remainingPercentage, 97)
	}

	const maxAvailableShare = getMaxAvailableShare()

	const { mutateAsync: createVacancy, isLoading: isCreating } = useMutation((data: Record<string, any>) =>
		axios.post<any>('/api/user/project/vacancy', data)
	)
	const { mutateAsync: saveVacancy, isLoading: isUpdating } = useMutation(
		(params: { id: string; data: Record<string, any> }) =>
			axios.put<any>('/api/user/project/vacancy', params.data, { params: { id: params.id } })
	)

	useEffect(() => {
		if (open && vacancyId) {
			fetchVacancy()
		}
	}, [open])

	const handleOk = async (asDraft?: { asDraft: boolean }) => {
		try {
			const formData = await form.validateFields()

			if (vacancyId) {
				await saveVacancy({
					id: vacancyId,
					data: {
						...formData,
						publishedAt: asDraft ? null : dayjs().toISOString(),
						status: asDraft ? prismaClient.TeamVacancyStatus.Draft : prismaClient.TeamVacancyStatus.Published,
						teamId,
					},
				})
			} else {
				await createVacancy({
					...formData,
					publishedAt: asDraft ? null : dayjs().toISOString(),
					status: asDraft ? prismaClient.TeamVacancyStatus.Draft : prismaClient.TeamVacancyStatus.Published,
					teamId,
				})
			}

			form.resetFields()
			setShowPromiseFields(false)
			message.success(vacancyId ? t('The vacancy is changed') : t('A new vacancy has been added'))
			onOk()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error(t('form.error', 'Error.Check if all data is entered correctly'))
			}
		}
	}

	const handleCancel = () => {
		form.resetFields()
		setShowPromiseFields(false)
		onCancel()
	}

	// Получаем доступные для выбора шаги (только следующие за текущим)
	const availableSteps = workflowData?.data?.steps
		? workflowData.data.steps
				.filter((step: any) => step.order >= (workflowData.data.currentStep?.order || 0))
				.map((step: any) => ({
					label: step.order === workflowData.data.currentStep?.order ? `${step.name} (current)` : step.name,
					value: step.id,
				}))
		: []

	return (
		<Modal
			centered
			className={styles.modal}
			title={vacancyId ? t('Change the vacancy') : t('Create a new vacancy')}
			width={800}
			destroyOnClose
			maskClosable={false}
			open={open}
			onCancel={handleCancel}
			confirmLoading={isLoadingVacancy || isUpdating || isCreating}
			footer={[
				<Space key="form-buttons" wrap>
					<Button key="close" onClick={handleCancel} disabled={isLoadingVacancy || isUpdating || isCreating}>
						{t('Close')}
					</Button>
					<Button
						key="draft"
						disabled={isLoadingVacancy || isUpdating || isCreating}
						onClick={() => handleOk({ asDraft: true })}
					>
						{t('Save as draft')}
					</Button>
					<Button
						key="public"
						disabled={isLoadingVacancy || isUpdating || isCreating}
						type="primary"
						onClick={() => handleOk()}
					>
						{vacancy?.data.status == prismaClient.TeamVacancyStatus.Published ? t('Save') : t('Publish')}
					</Button>
				</Space>,
			]}
		>
			<Spin spinning={isLoadingVacancy}>
				<Form
					form={form}
					layout="vertical"
					variant="filled"
					name="vacancy-form"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						teamId,
					}}
				>
					<Row gutter={[16, 16]}>
						<Col flex={1}>
							<Form.Item
								label={t('The name of the vacancy')}
								name="title"
								rules={[{ required: true }]}
								required
								wrapperCol={{ span: 24 }}
							>
								<Input width={'100%'} placeholder={t(`For example: The concept of the environment`)} />
							</Form.Item>
						</Col>
						<Col>
							<Form.Item
								name="finishedAt"
								label={t('Relevant to')}
								rules={[{ required: true }]}
								wrapperCol={{ span: 24 }}
							>
								<DatePicker format="DD.MM.YYYY" disabledDate={(current) => current && current < dayjs().endOf('day')} />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						name="directionId"
						label={t('What direction does this vacancy belong')}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Select
							style={{ width: '100%' }}
							placeholder={t(`For example: 2D art and animation`)}
							options={directionsOptions}
						/>
					</Form.Item>

					<Form.Item
						name="description"
						label={t('Vacancy description')}
						tooltip={t(
							'modal.vacancy.descriptionHelp',
							'Describe the requirements/wishes for the candidate, describe the kaku a job he has to do'
						)}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={t(
								'modal.vacancy.descriptionPlaceholder',
								`For example: I am looking for a concept designer from the environment that has experience at PC Projects, works in a realistic style.`
							)}
						/>
					</Form.Item>

					{!showPromiseFields && (
						<Form.Item wrapperCol={{ span: 24 }}>
							<Button type="text" icon={<MdOutlineHandshake />} onClick={() => setShowPromiseFields(true)}>
								{t('Add equity promise')}
							</Button>
						</Form.Item>
					)}

					{showPromiseFields && (
						<Card
							className={styles.promiseCard}
							title={t('Equity Promise')}
							extra={
								<Popconfirm
									title={t('Remove equity promise')}
									placement="topRight"
									onConfirm={() => {
										setShowPromiseFields(false)
										form.setFieldsValue({ promisePercentage: undefined, promiseTargetStepId: undefined })
									}}
								>
									<Button
										type="text"
										size="small"
										danger
										icon={<DeleteOutlined />}
										onClick={(e) => {
											e.stopPropagation()
										}}
									/>
								</Popconfirm>
							}
						>
							<Row gutter={[16, 16]}>
								<Col span={12}>
									<Form.Item
										name="promisePercentage"
										label={t('Promised equity percentage')}
										tooltip={t('Percentage of equity that will be promised to the candidate')}
										wrapperCol={{ span: 24 }}
										style={{ marginBottom: 0 }}
										rules={[{ required: true }]}
									>
										<InputNumber
											min={0}
											max={maxAvailableShare}
											style={{ width: '100%', height: 40 }}
											placeholder={t('Enter percentage')}
										/>
									</Form.Item>
									{maxAvailableShare > 0 && (
										<div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
											{t('Maximum available equity')}: {maxAvailableShare.toFixed(2)}%
										</div>
									)}
								</Col>
								<Col span={12}>
									<Form.Item
										name="promiseStepId"
										label={t('Required workflow step')}
										tooltip={t('Step that needs to be completed to receive the promised equity')}
										wrapperCol={{ span: 24 }}
										style={{ marginBottom: 0 }}
										rules={[{ required: true }]}
									>
										<Select
											style={{ width: '100%', height: 40 }}
											placeholder={t('Select step')}
											options={availableSteps}
											loading={isLoadingWorkflow}
										/>
									</Form.Item>
								</Col>
							</Row>
						</Card>
					)}
				</Form>
			</Spin>
		</Modal>
	)
}

export default VacancyModal
