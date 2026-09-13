import type { Project } from "@gdhub-io/gdhub-prisma";
import { IconFile } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, Form, Input, Modal, message, Select, Spin } from "antd";
import axios from "axios";
import { useEffect } from "react";
import { ProjectArtifactType } from "@/config/prisma-enums";
import { gtmEventTrigger } from "@/helpers/gtm";

const CreateArtifactModal = ({
	open,
	onCreate = () => {},
	onCancel = () => {},
	projectId,
}: any) => {
	const [form] = Form.useForm();
	const selectedArtifactType = Form.useWatch("type", form);
	const { t } = useTranslate();

	const {
		mutateAsync: createArtifact,
		error: createArtifactError,
		isPending: isCreateProcessing,
	} = useMutation({
		mutationFn: (data) =>
			axios.post<Project>("/api/user/project/artifacts", data),
	});

	useEffect(() => {
		const error = createArtifactError as any;
		if (error?.response?.data?.message) {
			message.error(error.response?.data?.message);
		}
	}, [createArtifactError]);

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

		const artifact = await createArtifact({ ...data, projectId });
		gtmEventTrigger("artifact_create", {
			projectId: artifact.data.id,
			name: artifact.data.name,
		});

		form.resetFields();

		onCreate();
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	const defaultNameForType = (type: string) => {
		switch (type) {
			case ProjectArtifactType.JDA:
				return "Joint Development Agreement";
			case ProjectArtifactType.Concept:
				return "Concept Document";
			case ProjectArtifactType.GDD:
				return "Game Design Document";
			case ProjectArtifactType.NDA:
				return "NDA";
			default:
				return "Other";
		}
	};

	useEffect(() => {
		if (selectedArtifactType === ProjectArtifactType.Other) {
			form.setFieldsValue({ name: "" });
		} else if (selectedArtifactType) {
			form.setFieldsValue({ name: defaultNameForType(selectedArtifactType) });
		}
	}, [selectedArtifactType]);

	return (
		<Modal
			centered
			title={
				<Flex align="center" gap={8}>
					<IconFile size={32} />
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
									value: ProjectArtifactType.JDA,
								},
								{
									label: "Concept Document",
									value: ProjectArtifactType.Concept,
								},
								{
									label: "Game Design Document",
									value: ProjectArtifactType.GDD,
								},
								{ label: "NDA", value: ProjectArtifactType.NDA },
								{ label: "Other", value: ProjectArtifactType.Other },
							]}
						/>
					</Form.Item>
					<Form.Item
						label={t("modal.create-document.field.name.label", "Title")}
						name="name"
						rules={[
							{
								required: selectedArtifactType === ProjectArtifactType.Other,
							},
						]}
						wrapperCol={{ span: 24 }}
						hidden={selectedArtifactType !== ProjectArtifactType.Other}
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

export default CreateArtifactModal;
