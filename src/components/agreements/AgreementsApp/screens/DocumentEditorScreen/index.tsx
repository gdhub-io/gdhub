"use client";

import { IconArrowLeft, IconSend, IconVariable } from "@tabler/icons-react";
import {
	Alert,
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
	Typography,
} from "antd";
import { useMemo, useState } from "react";
import { DocumentRenderer } from "@/components/agreements/DocumentRenderer";
import type {
	LegalDocumentTemplate,
	ProjectLegalSnapshot,
} from "@/types/agreements";
import {
	LegalDocumentContext,
	ProjectLegalSnapshotStatus,
} from "@/types/agreements";

const { Text, Title } = Typography;

const contextColor: Record<LegalDocumentContext, string> = {
	[LegalDocumentContext.Platform]: "blue",
	[LegalDocumentContext.Project]: "purple",
	[LegalDocumentContext.Person]: "orange",
};

const renderMarkdown = (
	markdown: string,
	params: Record<string, string>,
): string =>
	markdown.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);

interface DocumentEditorScreenProps {
	templates: LegalDocumentTemplate[];
	initialTemplateId?: string;
	onBack: () => void;
	onPublish: (snapshot: Omit<ProjectLegalSnapshot, "id" | "createdAt">) => void;
}

export const DocumentEditorScreen = ({
	templates,
	initialTemplateId,
	onBack,
	onPublish,
}: DocumentEditorScreenProps) => {
	const [selectedTemplateId, setSelectedTemplateId] = useState<
		string | undefined
	>(initialTemplateId ?? templates[0]?.id);

	const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

	const initialParams = useMemo((): Record<string, string> => {
		if (selectedTemplate?.context === LegalDocumentContext.Platform) {
			return { project_name: "Platform" };
		}
		return {};
	}, [selectedTemplate]);

	const [params, setParams] = useState<Record<string, string>>(initialParams);

	const handleSelectTemplate = (id: string) => {
		setSelectedTemplateId(id);
		const tpl = templates.find((t) => t.id === id);
		if (tpl?.context === LegalDocumentContext.Platform) {
			setParams({ project_name: "Platform" });
		} else {
			setParams({});
		}
	};

	const handleParamChange = (key: string, value: string) => {
		setParams((prev) => ({ ...prev, [key]: value }));
	};

	const renderedMarkdown = useMemo(() => {
		if (!selectedTemplate) return "";
		return renderMarkdown(selectedTemplate.contentMarkdown, params);
	}, [selectedTemplate, params]);

	const missingVars = useMemo(() => {
		if (!selectedTemplate) return [];
		return (selectedTemplate.variables ?? [])
			.map((v) => v.key)
			.filter((k) => !params[k]?.trim());
	}, [selectedTemplate, params]);

	const previewSnapshot = useMemo((): ProjectLegalSnapshot | null => {
		if (!selectedTemplate) return null;
		return {
			id: "preview",
			projectId:
				selectedTemplate.context === LegalDocumentContext.Platform
					? "platform"
					: (params.project_id ?? ""),
			templateId: selectedTemplate.id,
			templateVersion: selectedTemplate.version,
			status: ProjectLegalSnapshotStatus.Active,
			title: selectedTemplate.title,
			renderedMarkdown,
			params,
			createdById: "",
			createdAt: new Date().toISOString(),
			template: {
				id: selectedTemplate.id,
				context: selectedTemplate.context,
				version: selectedTemplate.version,
				title: selectedTemplate.title,
			},
		};
	}, [selectedTemplate, renderedMarkdown, params]);

	const handleCreate = () => {
		if (!selectedTemplate || !previewSnapshot) return;
		const { id: _id, createdAt: _createdAt, ...data } = previewSnapshot;
		onPublish(data);
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
						New Document
					</Title>
				</Space>
				<Button
					type="primary"
					icon={<IconSend size={14} />}
					onClick={handleCreate}
					disabled={!selectedTemplate || missingVars.length > 0}
				>
					Create document
				</Button>
			</Flex>

			<Row gutter={24} align="top">
				{/* Left: template selection + variables */}
				<Col span={10}>
					<Card style={{ marginBottom: 16 }}>
						<Form layout="vertical" variant="filled" requiredMark="optional">
							<Form.Item label="Template" style={{ marginBottom: 0 }}>
								<Select
									value={selectedTemplateId}
									onChange={handleSelectTemplate}
									placeholder="Select a template"
									optionLabelProp="label"
									style={{ width: "100%" }}
								>
									{templates.map((t) => (
										<Select.Option key={t.id} value={t.id} label={t.title}>
											<Flex justify="space-between" align="center">
												<Text>{t.title}</Text>
												<Space size={4}>
													<Tag
														color={contextColor[t.context]}
														style={{ margin: 0 }}
													>
														{t.context}
													</Tag>
													<Tag style={{ margin: 0 }}>v{t.version}</Tag>
												</Space>
											</Flex>
										</Select.Option>
									))}
								</Select>
							</Form.Item>
						</Form>
					</Card>

					{selectedTemplate && (
						<Card
							title={
								<Space>
									<IconVariable size={14} />
									Variables
									{missingVars.length > 0 && (
										<Tag color="orange">{missingVars.length} missing</Tag>
									)}
								</Space>
							}
						>
							{selectedTemplate.context === LegalDocumentContext.Platform && (
								<Alert
									type="info"
									showIcon
									message="Platform document — applies to all users. No project needed."
									style={{ marginBottom: 16 }}
								/>
							)}

							{(selectedTemplate.variables ?? []).length === 0 ? (
								<Text type="secondary" style={{ fontSize: 13 }}>
									This template has no variables.
								</Text>
							) : (
								<Form
									layout="vertical"
									variant="filled"
									requiredMark="optional"
								>
									{(selectedTemplate.variables ?? []).map((variable) => (
										<Form.Item
											key={variable.key}
											label={
												<Space size={4}>
													{variable.label}
													<Tag
														style={{ margin: 0, fontSize: 11 }}
													>{`{{${variable.key}}}`}</Tag>
												</Space>
											}
											help={variable.description}
											style={{ marginBottom: 12 }}
										>
											<Input
												value={params[variable.key] ?? ""}
												onChange={(e) =>
													handleParamChange(variable.key, e.target.value)
												}
												placeholder={`Enter ${variable.label.toLowerCase()}`}
												status={
													missingVars.includes(variable.key)
														? "warning"
														: undefined
												}
											/>
										</Form.Item>
									))}
								</Form>
							)}
						</Card>
					)}
				</Col>

				{/* Right: live preview */}
				<Col span={14}>
					<div style={{ position: "sticky", top: 24 }}>
						{previewSnapshot ? (
							<DocumentRenderer
								snapshot={previewSnapshot}
								showHeader
								style={{
									border: "1px solid var(--ant-color-border)",
									borderRadius: 8,
								}}
							/>
						) : (
							<Card>
								<Text
									type="secondary"
									style={{ fontSize: 13, fontStyle: "italic" }}
								>
									Select a template to see the document preview.
								</Text>
							</Card>
						)}
					</div>
				</Col>
			</Row>
		</div>
	);
};
