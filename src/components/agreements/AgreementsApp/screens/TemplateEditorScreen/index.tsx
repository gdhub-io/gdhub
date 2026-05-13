"use client";

import {
	IconArrowLeft,
	IconDeviceFloppy,
	IconVariable,
} from "@tabler/icons-react";
import {
	Button,
	Card,
	Col,
	Flex,
	Form,
	Input,
	Row,
	Select,
	Space,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import type {
	LegalDocumentTemplate,
	LegalTemplateVariable,
} from "@/types/agreements";
import { LegalDocumentContext } from "@/types/agreements";

const { TextArea } = Input;
const { Text, Title } = Typography;

const contextColor: Record<LegalDocumentContext, string> = {
	[LegalDocumentContext.Platform]: "blue",
	[LegalDocumentContext.Project]: "purple",
	[LegalDocumentContext.Person]: "orange",
};

const extractVariables = (markdown: string): string[] => {
	const matches = markdown.match(/\{\{(\w+)\}\}/g) ?? [];
	return [...new Set(matches.map((m) => m.slice(2, -2)))];
};

interface TemplateEditorScreenProps {
	template?: LegalDocumentTemplate;
	onBack: () => void;
	onSave: (data: Partial<LegalDocumentTemplate>) => void;
}

export const TemplateEditorScreen = ({
	template,
	onBack,
	onSave,
}: TemplateEditorScreenProps) => {
	const [form] = Form.useForm();
	const [markdown, setMarkdown] = useState(template?.contentMarkdown ?? "");
	const [context, setContext] = useState<LegalDocumentContext>(
		template?.context ?? LegalDocumentContext.Project,
	);

	useEffect(() => {
		if (template) {
			form.setFieldsValue({
				title: template.title,
				context: template.context,
				locale: template.locale,
			});
			setMarkdown(template.contentMarkdown);
			setContext(template.context);
		}
	}, [template, form]);

	const detectedVars = useMemo(() => extractVariables(markdown), [markdown]);

	const handleSave = async () => {
		try {
			const values = await form.validateFields();
			onSave({
				...values,
				contentMarkdown: markdown,
				variables: detectedVars.map<LegalTemplateVariable>((key) => ({
					key,
					label: key
						.replace(/_/g, " ")
						.replace(/\b\w/g, (c) => c.toUpperCase()),
				})),
			});
		} catch {
			// validation error — form will highlight fields
		}
	};

	return (
		<div>
			{/* Header */}
			<Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
				<Space>
					<Button
						type="text"
						icon={<IconArrowLeft size={16} />}
						onClick={onBack}
					>
						Back
					</Button>
					<Title level={4} style={{ margin: 0 }}>
						{template ? template.title : "New Template"}
					</Title>
					{template && (
						<Tag color={contextColor[template.context]}>{template.context}</Tag>
					)}
				</Space>
				<Button
					type="primary"
					icon={<IconDeviceFloppy size={14} />}
					onClick={handleSave}
					disabled={!markdown.trim()}
				>
					Save
				</Button>
			</Flex>

			<Row gutter={24} align="top">
				{/* Left: editor */}
				<Col span={14}>
					<Card>
						<Form
							form={form}
							layout="vertical"
							variant="filled"
							requiredMark="optional"
						>
							<Row gutter={16}>
								<Col flex="1">
									<Form.Item
										label="Title"
										name="title"
										rules={[{ required: true, message: "Required" }]}
									>
										<Input placeholder="e.g. Co-Development Agreement" />
									</Form.Item>
								</Col>
								<Col style={{ width: 170 }}>
									<Form.Item
										label="Context"
										name="context"
										rules={[{ required: true, message: "Required" }]}
										initialValue={LegalDocumentContext.Project}
									>
										<Select onChange={(v) => setContext(v)}>
											<Select.Option value={LegalDocumentContext.Platform}>
												Platform
											</Select.Option>
											<Select.Option value={LegalDocumentContext.Project}>
												Project
											</Select.Option>
											<Select.Option value={LegalDocumentContext.Person}>
												Person
											</Select.Option>
										</Select>
									</Form.Item>
								</Col>
								<Col style={{ width: 110 }}>
									<Form.Item label="Locale" name="locale" initialValue="en">
										<Select>
											<Select.Option value="en">EN</Select.Option>
											<Select.Option value="ru">RU</Select.Option>
										</Select>
									</Form.Item>
								</Col>
							</Row>

							<Form.Item
								label={
									<Space size={6}>
										Content
										<Tag style={{ margin: 0 }}>Markdown</Tag>
										<Tooltip title="Use {{variable_name}} for dynamic values">
											<IconVariable
												size={13}
												style={{ color: "var(--ant-color-text-tertiary)" }}
											/>
										</Tooltip>
									</Space>
								}
								style={{ marginBottom: detectedVars.length ? 12 : 0 }}
							>
								<TextArea
									value={markdown}
									onChange={(e) => setMarkdown(e.target.value)}
									rows={20}
									style={{
										fontFamily: "var(--font-mono, monospace)",
										fontSize: 13,
										lineHeight: 1.7,
									}}
									placeholder={`Enter agreement text.\nUse {{variable_name}} for dynamic values, e.g. {{author_name}}, {{project_name}}.`}
								/>
							</Form.Item>
						</Form>

						{detectedVars.length > 0 && (
							<div>
								<Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
									Detected variables:
								</Text>
								{detectedVars.map((v) => (
									<Tag key={v} color="purple" style={{ marginBottom: 4 }}>
										{`{{${v}}}`}
									</Tag>
								))}
							</div>
						)}
					</Card>
				</Col>

				{/* Right: live preview */}
				<Col span={10}>
					<div style={{ position: "sticky", top: 24 }}>
						<Card
							title={
								<Space>
									Preview
									{context && (
										<Tag color={contextColor[context]}>{context}</Tag>
									)}
								</Space>
							}
							size="small"
						>
							{markdown.trim() ? (
								<div
									style={{
										whiteSpace: "pre-wrap",
										fontSize: 13,
										lineHeight: 1.8,
										color: "var(--ant-color-text)",
										minHeight: 200,
									}}
								>
									{markdown}
								</div>
							) : (
								<Text
									type="secondary"
									style={{ fontSize: 13, fontStyle: "italic" }}
								>
									Start typing in the editor to see a preview here.
								</Text>
							)}
						</Card>
					</div>
				</Col>
			</Row>
		</div>
	);
};
