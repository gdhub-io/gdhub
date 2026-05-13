"use client";

import { Tabs, Typography } from "antd";
import { useState } from "react";
import {
	getDocumentAcceptances,
	getSnapshotVersions,
	MOCK_ACCEPTANCES,
	MOCK_SNAPSHOTS,
	MOCK_TEMPLATES,
} from "@/mocks/agreements";
import type {
	LegalDocumentTemplate,
	ProjectLegalSnapshot,
} from "@/types/agreements";
import { ProjectLegalSnapshotStatus } from "@/types/agreements";
import { AcceptancesScreen } from "./screens/AcceptancesScreen";
import { DocumentDetailScreen } from "./screens/DocumentDetailScreen";
import { DocumentEditorScreen } from "./screens/DocumentEditorScreen";
import { DocumentsScreen } from "./screens/DocumentsScreen";
import { TemplateEditorScreen } from "./screens/TemplateEditorScreen";
import { TemplatesScreen } from "./screens/TemplatesScreen";
import styles from "./style.module.scss";

const { Title } = Typography;

type TemplatesView = "list" | "editor";
type DocumentsView = "list" | "editor" | "detail";

export const AgreementsApp = () => {
	const [activeTab, setActiveTab] = useState("templates");

	// Templates tab state
	const [templatesView, setTemplatesView] = useState<TemplatesView>("list");
	const [editingTemplate, setEditingTemplate] = useState<
		LegalDocumentTemplate | undefined
	>();
	const [templates, setTemplates] = useState(MOCK_TEMPLATES);

	// Documents tab state
	const [documentsView, setDocumentsView] = useState<DocumentsView>("list");
	const [viewingSnapshot, setViewingSnapshot] = useState<
		ProjectLegalSnapshot | undefined
	>();
	const [editorInitialTemplateId, setEditorInitialTemplateId] = useState<
		string | undefined
	>();
	const [snapshots, setSnapshots] = useState(MOCK_SNAPSHOTS);

	// ── Templates handlers ──────────────────────────────────────────────────────

	const handleEditTemplate = (template: LegalDocumentTemplate) => {
		setEditingTemplate(template);
		setTemplatesView("editor");
	};

	const handleCreateTemplate = () => {
		setEditingTemplate(undefined);
		setTemplatesView("editor");
	};

	const handleBackToTemplates = () => {
		setTemplatesView("list");
		setEditingTemplate(undefined);
	};

	const handleSaveTemplate = (data: Partial<LegalDocumentTemplate>) => {
		if (editingTemplate) {
			setTemplates((prev) =>
				prev.map((t) => (t.id === editingTemplate.id ? { ...t, ...data } : t)),
			);
		} else {
			const newTemplate: LegalDocumentTemplate = {
				id: `tpl-${Date.now()}`,
				version: 1,
				locale: "en",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				snapshotCount: 0,
				...data,
			} as LegalDocumentTemplate;
			setTemplates((prev) => [...prev, newTemplate]);
		}
		handleBackToTemplates();
	};

	// ── Documents handlers ──────────────────────────────────────────────────────

	const handleViewDocument = (snapshot: ProjectLegalSnapshot) => {
		setViewingSnapshot(snapshot);
		setDocumentsView("detail");
	};

	const handleOpenDocumentEditor = (initialTemplateId?: string) => {
		setEditorInitialTemplateId(initialTemplateId);
		setDocumentsView("editor");
	};

	/** Called from TemplatesScreen — switches to Documents tab and opens editor */
	const handleCreateDocumentFromTemplate = (
		template: LegalDocumentTemplate,
	) => {
		setActiveTab("documents");
		handleOpenDocumentEditor(template.id);
	};

	const handleBackToDocuments = () => {
		setDocumentsView("list");
		setViewingSnapshot(undefined);
		setEditorInitialTemplateId(undefined);
	};

	const handlePublishDocument = (
		data: Omit<ProjectLegalSnapshot, "id" | "createdAt">,
	) => {
		const tpl = templates.find((t) => t.id === data.templateId);
		const newSnapshot: ProjectLegalSnapshot = {
			...data,
			id: `snap-${Date.now()}`,
			createdAt: new Date().toISOString(),
			acceptances: [],
			status: ProjectLegalSnapshotStatus.Active,
			template: tpl
				? {
						id: tpl.id,
						context: tpl.context,
						version: tpl.version,
						title: tpl.title,
					}
				: undefined,
		};
		setSnapshots((prev) => [newSnapshot, ...prev]);
		handleBackToDocuments();
	};

	// ── Tabs ────────────────────────────────────────────────────────────────────

	const documentsContent =
		documentsView === "detail" && viewingSnapshot ? (
			<DocumentDetailScreen
				snapshot={viewingSnapshot}
				versions={getSnapshotVersions(
					viewingSnapshot.templateId,
					viewingSnapshot.projectId,
				)}
				acceptances={getDocumentAcceptances(
					viewingSnapshot.templateId,
					viewingSnapshot.projectId,
				)}
				onBack={handleBackToDocuments}
				onViewVersion={handleViewDocument}
			/>
		) : documentsView === "editor" ? (
			<DocumentEditorScreen
				templates={templates}
				initialTemplateId={editorInitialTemplateId}
				onBack={handleBackToDocuments}
				onPublish={handlePublishDocument}
			/>
		) : (
			<DocumentsScreen
				snapshots={snapshots}
				onView={handleViewDocument}
				onCreate={() => handleOpenDocumentEditor()}
			/>
		);

	const tabItems = [
		{
			key: "templates",
			label: "Templates",
			children:
				templatesView === "editor" ? (
					<TemplateEditorScreen
						template={editingTemplate}
						onBack={handleBackToTemplates}
						onSave={handleSaveTemplate}
					/>
				) : (
					<TemplatesScreen
						templates={templates}
						onEdit={handleEditTemplate}
						onCreate={handleCreateTemplate}
						onCreateDocument={handleCreateDocumentFromTemplate}
					/>
				),
		},
		{
			key: "documents",
			label: "Documents",
			children: documentsContent,
		},
		{
			key: "acceptances",
			label: "Acceptances",
			children: <AcceptancesScreen acceptances={MOCK_ACCEPTANCES} />,
		},
	];

	return (
		<div className={styles.main}>
			<Title level={2}>Legal Agreements</Title>
			<Tabs
				activeKey={activeTab}
				onChange={(key) => {
					setActiveTab(key);
					setDocumentsView("list");
					setViewingSnapshot(undefined);
					setEditorInitialTemplateId(undefined);
					setTemplatesView("list");
				}}
				items={tabItems}
			/>
		</div>
	);
};
