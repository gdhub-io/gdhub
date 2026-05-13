"use client";

import { Typography } from "antd";
import { useState } from "react";
import {
	MOCK_PROJECT_MEMBERS,
	MOCK_SNAPSHOTS,
	MOCK_TEMPLATES,
} from "@/mocks/agreements";
import type {
	LegalDocumentTemplate,
	ProjectLegalSnapshot,
} from "@/types/agreements";
import { ProjectLegalSnapshotStatus } from "@/types/agreements";
import { DocumentEditorScreen } from "./screens/DocumentEditorScreen";
import { DocumentsScreen } from "./screens/DocumentsScreen";
import { SignersScreen } from "./screens/SignersScreen";

const { Title } = Typography;

type View = "list" | "editor" | "signers";

interface ProjectAgreementsAppProps {
	projectId: string;
	projectName: string;
	authorName: string;
	/** Whether the current user can create/manage documents (project author or admin) */
	canManage: boolean;
}

export const ProjectAgreementsApp = ({
	projectId,
	projectName,
	authorName,
	canManage,
}: ProjectAgreementsAppProps) => {
	const [view, setView] = useState<View>("list");
	const [viewingSnapshot, setViewingSnapshot] = useState<
		ProjectLegalSnapshot | undefined
	>();
	const [snapshots, setSnapshots] = useState<ProjectLegalSnapshot[]>(
		MOCK_SNAPSHOTS.filter((s) => s.projectId === "proj-1"),
	);

	const handleCreate = () => setView("editor");

	const handleSigners = (snapshot: ProjectLegalSnapshot) => {
		setViewingSnapshot(snapshot);
		setView("signers");
	};

	const handleBack = () => {
		setView("list");
		setViewingSnapshot(undefined);
	};

	const handlePublish = (
		data: Omit<ProjectLegalSnapshot, "id" | "createdAt">,
	) => {
		const newSnapshot: ProjectLegalSnapshot = {
			...data,
			id: `snap-${Date.now()}`,
			createdAt: new Date().toISOString(),
			acceptances: [],
			status: ProjectLegalSnapshotStatus.Active,
			template: MOCK_TEMPLATES.find((t) => t.id === data.templateId) as
				| LegalDocumentTemplate
				| undefined,
		};
		setSnapshots((prev) => [newSnapshot, ...prev]);
		setView("list");
	};

	return (
		<div style={{ padding: "24px 32px" }}>
			<Title level={4} style={{ marginBottom: 24 }}>
				Project Agreements · {projectName}
			</Title>

			{view === "list" && (
				<DocumentsScreen
					snapshots={snapshots}
					projectName={projectName}
					canCreate={canManage}
					onView={(s) => handleSigners(s)}
					onSigners={handleSigners}
					onCreate={handleCreate}
				/>
			)}

			{view === "editor" && (
				<DocumentEditorScreen
					templates={MOCK_TEMPLATES}
					projectId={projectId}
					projectName={projectName}
					authorName={authorName}
					onBack={handleBack}
					onPublish={handlePublish}
				/>
			)}

			{view === "signers" && viewingSnapshot && (
				<SignersScreen
					snapshot={viewingSnapshot}
					projectMembers={MOCK_PROJECT_MEMBERS}
					canManage={canManage}
					onBack={handleBack}
				/>
			)}
		</div>
	);
};
