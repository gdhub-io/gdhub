"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Flex, Form, Input, Modal, Radio, Select, Typography } from "antd";
import axios from "axios";
import { useState } from "react";
import styles from "./CreateWorkflowModal.module.scss";
import { useWorkflowTemplates } from "./workflow/queries";

const { Text } = Typography;

/** The identifier other systems address the template by, so it stays ASCII. */
const slugify = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

export const CreateWorkflowModal = ({
	open,
	onCancel,
	onOk,
}: {
	open: boolean;
	onCancel: () => void;
	onOk: (id: string) => void;
}) => {
	const { message } = App.useApp();
	const [form] = Form.useForm();
	const [start, setStart] = useState<"blank" | "copy">("blank");
	// Only until the admin types one: after that the identifier is theirs.
	const [identifierTouched, setIdentifierTouched] = useState(false);

	const { data: templates } = useWorkflowTemplates(open);

	const { mutateAsync: createWorkflow, isPending } = useMutation({
		mutationFn: (values: {
			title: string;
			name: string;
			copyFromId?: string;
		}) => axios.post("/api/admin/workflow", values).then((res) => res.data),
		onSuccess: (data: { id: string }) => {
			form.resetFields();
			setStart("blank");
			setIdentifierTouched(false);
			onOk(data.id);
		},
		onError: (error) => {
			const reason =
				axios.isAxiosError(error) && error.response?.data?.error
					? String(error.response.data.error)
					: "Could not create the template";
			message.error(reason);
		},
	});

	const handleOk = async () => {
		const values = await form.validateFields();
		await createWorkflow({
			title: values.title,
			name: values.name,
			copyFromId: start === "copy" ? values.copyFromId : undefined,
		});
	};

	return (
		<Modal
			centered
			destroyOnHidden
			okText="Create template"
			cancelText="Cancel"
			title="New workflow template"
			open={open}
			onCancel={onCancel}
			onOk={handleOk}
			confirmLoading={isPending}
		>
			<Form form={form} layout="vertical" requiredMark={false} variant="filled">
				<Form.Item
					name="title"
					label="Title"
					rules={[{ required: true, message: "Enter a title" }]}
				>
					<Input
						placeholder="e.g. Indie game launch"
						onChange={(event) => {
							if (identifierTouched) return;
							form.setFieldValue("name", slugify(event.target.value));
						}}
					/>
				</Form.Item>

				<Form.Item
					name="name"
					label="Identifier"
					extra="Used by the API and by task conditions. Generated from the title."
					rules={[
						{ required: true, message: "Enter an identifier" },
						{
							pattern: /^[a-z0-9-]+$/,
							message: "Lowercase letters, digits and dashes only",
						},
					]}
				>
					<Input
						placeholder="indie-game-launch"
						onChange={() => setIdentifierTouched(true)}
					/>
				</Form.Item>

				<Form.Item label="Start from">
					<Radio.Group
						value={start}
						onChange={(event) => setStart(event.target.value)}
						className={styles.starts}
					>
						<Flex gap={12} wrap>
							<Radio value="blank" className={styles.start}>
								<Flex vertical gap={2}>
									<span className={styles.startTitle}>Blank template</span>
									<Text type="secondary" className={styles.startText}>
										Add steps manually
									</Text>
								</Flex>
							</Radio>
							<Radio value="copy" className={styles.start}>
								<Flex vertical gap={2}>
									<span className={styles.startTitle}>
										Copy an existing one
									</span>
									<Text type="secondary" className={styles.startText}>
										Duplicate steps and tasks
									</Text>
								</Flex>
							</Radio>
						</Flex>
					</Radio.Group>
				</Form.Item>

				{start === "copy" && (
					<Form.Item
						name="copyFromId"
						label="Template to copy"
						rules={[{ required: true, message: "Pick a template to copy" }]}
					>
						<Select
							placeholder="Pick a template"
							options={(templates ?? []).map((template) => ({
								value: template.id,
								label: template.title ?? template.name,
							}))}
						/>
					</Form.Item>
				)}
			</Form>
		</Modal>
	);
};
