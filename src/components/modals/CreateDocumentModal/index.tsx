import type { Project } from "@gdhub-io/gdhub-prisma";
import { PiFileDuotone } from "@react-icons/all-files/pi/PiFileDuotone";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, Form, Input, Modal, message, Select, Spin } from "antd";
import axios from "axios";
import { useEffect } from "react";
import { TeamDocumentType } from "@/config/prisma-enums";
import { gtmEventTrigger } from "@/helpers/gtm";

const CreateDocumentModal = ({
	open,
	onCreate = () => {},
	onCancel = () => {},
	teamId,
}: any) => {
	const [form] = Form.useForm();
	const selectedDocumentType = Form.useWatch("type", form);
	const { t } = useTranslate();

	const {
		mutateAsync: createDocument,
		error: createDocumentError,
		isPending: isCreateProcessing,
	} = useMutation({
		mutationFn: (data) =>
			axios.post<Project>("/api/user/project/documents", data),
	});

	useEffect(() => {
		const error = createDocumentError as any;
		if (error?.response?.data?.message) {
			message.error(error.response?.data?.message);
		}
	}, [createDocumentError]);

	const handleOk = async () => {
		let data: any;

		try {
			data = await form.validateFields();
		} catch (error: any) {
			if (!Object.hasOwn(error, "errorFields")) {
				message.error(error.message);
				return;
			}
		}

		if (!data) return;

		const document = await createDocument({ ...data, teamId });
		gtmEventTrigger("document_create", {
			projectId: document.data.id,
			name: document.data.name,
		});

		form.resetFields();

		onCreate();
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	const renderDocumentType = (type: string) => {
		switch (type) {
			case TeamDocumentType.JDA:
				return "Joint Development Agreement";
			case TeamDocumentType.Concept:
				return "Concept Document";
			case TeamDocumentType.GDD:
				return "Game Design Document";
			case TeamDocumentType.NDA:
				return "NDA";
			default:
				return "Other";
		}
	};

	useEffect(() => {
		if (selectedDocumentType === TeamDocumentType.Other) {
			form.setFieldsValue({ name: "" });
		} else if (selectedDocumentType) {
			form.setFieldsValue({ name: renderDocumentType(selectedDocumentType) });
		}
	}, [selectedDocumentType]);

	return (
		<Modal
			centered
			title={
				<Flex align="center" gap={8}>
					<PiFileDuotone size={32} />
					{t("modal.create-document.title", "Add new team document")}
				</Flex>
			}
			width={640}
			mask={{ closable: false }}
			okText={t("modal.create-document.ok-text", "Add")}
			cancelText={t("modal.create-document.cancel-text", "Cancel")}
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
					wrapperCol={{ span: 24 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{ agree: false }}
				>
					<Form.Item
						label={t("modal.create-document.field.type.label", "Type")}
						name="type"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Select
							placeholder={t(
								"modal.create-document.field.type.placeholder",
								"Select document type",
							)}
							options={[
								{
									label: "Joint Development Agreement",
									value: TeamDocumentType.JDA,
								},
								{
									label: "Concept Document",
									value: TeamDocumentType.Concept,
								},
								{
									label: "Game Design Document",
									value: TeamDocumentType.GDD,
								},
								{ label: "NDA", value: TeamDocumentType.NDA },
								{ label: "Other", value: TeamDocumentType.Other },
							]}
						/>
					</Form.Item>
					<Form.Item
						label={t("modal.create-document.field.name.label", "Title")}
						name="name"
						rules={[
							{
								required: selectedDocumentType === TeamDocumentType.Other,
							},
						]}
						wrapperCol={{ span: 24 }}
						hidden={selectedDocumentType !== TeamDocumentType.Other}
					>
						<Input
							placeholder={t(
								"modal.create-document.field.name.placeholder",
								"Document title",
							)}
						/>
					</Form.Item>

					<Form.Item
						label={t(
							"modal.create-document.field.link.label",
							"Link to document",
						)}
						name="link"
						rules={[{ required: true, type: "url" }]}
						wrapperCol={{ span: 24 }}
					>
						<Input
							placeholder={t(
								"modal.create-document.field.link.placeholder",
								"https://example.com/document.pdf",
							)}
						/>
					</Form.Item>
					<Form.Item
						name="description"
						label={t(
							"modal.create-document.field.description.label",
							"Short Description",
						)}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={3}
							placeholder={t(
								"modal.create-document.field.description.placeholder",
								"This document is about...",
							)}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	);
};

export default CreateDocumentModal;
