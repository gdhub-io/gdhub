import { useEffect } from 'react'
import { useWorkDirections } from '@/hooks/library'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Col, DatePicker, Form, Input, message, Modal, Row, Select, Space, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'

const VacancyModal = ({ teamId, vacancyId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const { t } = useTolgee()
	const { options: directionsOptions } = useWorkDirections()

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
				form.setFieldsValue({ ...data, finishedAt: dayjs(data.finishedAt) })
			},
		}
	)

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
			message.success(vacancyId ? <T>The vacancy is changed</T> : <T>A new vacancy has been added</T>)
			onOk()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
			} else {
				message.error(<T keyName="form.error">Error.Check if all data is entered correctly</T>)
			}
		}
	}

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	return (
		<Modal
			centered
			title={vacancyId ? <T>Change the vacancy</T> : <T>Create a new vacancy</T>}
			width={800}
			destroyOnClose
			maskClosable={false}
			open={open}
			onCancel={handleCancel}
			confirmLoading={isLoadingVacancy || isUpdating || isCreating}
			footer={[
				<Space key="form-buttons" wrap>
					<Button key="close" onClick={handleCancel} disabled={isLoadingVacancy || isUpdating || isCreating}>
						<T>Close</T>
					</Button>
					<Button
						key="draft"
						disabled={isLoadingVacancy || isUpdating || isCreating}
						onClick={() => handleOk({ asDraft: true })}
					>
						<T>Save as draft</T>
					</Button>
					<Button
						key="public"
						disabled={isLoadingVacancy || isUpdating || isCreating}
						type="primary"
						onClick={() => handleOk()}
					>
						{vacancy?.data.status == prismaClient.TeamVacancyStatus.Published ? <T>Save</T> : <T>Publish</T>}
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
						help={
							<T keyName="modal.vacancy.descriptionHelp">
								Describe the requirements/wishes for the candidate, describe the kaku a job he has to do
							</T>
						}
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
				</Form>
			</Spin>
		</Modal>
	)
}

export default VacancyModal
