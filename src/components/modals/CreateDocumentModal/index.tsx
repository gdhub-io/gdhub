import { useEffect } from 'react'
import { gtmEventTrigger } from '@/helpers/gtm'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { PiFileDuotone } from '@react-icons/all-files/pi/PiFileDuotone'
import { useMutation } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Flex, Form, Input, message, Modal, Select, Spin } from 'antd'
import axios from 'axios'

const CreateDocumentModal = ({ open, onCreate = () => {}, onCancel = () => {}, teamId }: any) => {
	const [form] = Form.useForm()
	const selectedDocumentType = Form.useWatch('type', form)
	const { t } = useTolgee()

	const {
		mutateAsync: createDocument,
		error: createDocumentError,
		isLoading: isCreateProcessing,
	} = useMutation((data) => axios.post<prismaClient.Project>('/api/user/project/documents', data))

	useEffect(() => {
		const error = createDocumentError as any
		if (error?.response?.data?.message) {
			message.error(error.response?.data?.message)
		}
	}, [createDocumentError])

	const handleOk = async () => {
		let data: any

		try {
			data = await form.validateFields()
		} catch (error: any) {
			if (!error.hasOwnProperty('errorFields')) {
				message.error(error.message)
				return
			}
		}

		if (!data) return

		const document = await createDocument({ ...data, teamId })
		gtmEventTrigger('document_create', { projectId: document.data.id, name: document.data.name })

		onCreate()
	}

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	const renderDocumentType = (type: string) => {
		switch (type) {
			case prismaClient.TeamDocumentType.Concept:
				return 'Concept Document'
			case prismaClient.TeamDocumentType.GDD:
				return 'Game Design Document'
			case prismaClient.TeamDocumentType.NDA:
				return 'NDA'
			default:
				return 'Other'
		}
	}

	useEffect(() => {
		if (selectedDocumentType === 'other') {
			form.setFieldsValue({ name: '' })
		} else {
			form.setFieldsValue({ name: renderDocumentType(selectedDocumentType) })
		}
	}, [selectedDocumentType])

	return (
		<Modal
			centered
			title={
				<Flex align="center" gap={8}>
					<PiFileDuotone size={32} />
					<T keyName="modal.create-document.title">Add new team document</T>
				</Flex>
			}
			width={640}
			maskClosable={false}
			okText={<T>Add</T>}
			cancelText={<T>Cancel</T>}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isCreateProcessing}
		>
			<Spin spinning={isCreateProcessing}>
				<Form
					form={form}
					variant="filled"
					layout="vertical"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{ agree: false }}
				>
					<Form.Item
						label={<T keyName="modal.create-document.field.type.label">Type</T>}
						name="type"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Select
							placeholder="Select document type"
							options={[
								{ label: 'Concept Document', value: prismaClient.TeamDocumentType.Concept },
								{ label: 'Game Design Document', value: prismaClient.TeamDocumentType.GDD },
								{ label: 'NDA', value: prismaClient.TeamDocumentType.NDA },
								{ label: 'Other', value: prismaClient.TeamDocumentType.Other },
							]}
						/>
					</Form.Item>

					<Form.Item
						label={<T keyName="modal.create-document.field.name.label">Title</T>}
						name="name"
						rules={[{ required: selectedDocumentType === 'other' }]}
						wrapperCol={{ span: 24 }}
						hidden={selectedDocumentType != 'other'}
					>
						<Input placeholder="Document title" />
					</Form.Item>

					<Form.Item
						label={<T keyName="modal.create-document.field.link.label">Link to document</T>}
						name="link"
						rules={[{ required: true, type: 'url' }]}
						wrapperCol={{ span: 24 }}
					>
						<Input placeholder="https://example.com/document.pdf" />
					</Form.Item>
					<Form.Item
						name="description"
						label={<T keyName="modal.create-document.field.description.label">Short Description</T>}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={t('modal.create-document.field.description.placeholder', 'This document is about...')}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	)
}

export default CreateDocumentModal
