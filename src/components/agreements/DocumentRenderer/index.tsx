"use client";

import { Tag, Typography } from "antd";
import type { ProjectLegalSnapshot } from "@/types/agreements";
import { ProjectLegalSnapshotStatus } from "@/types/agreements";

const { Text, Title } = Typography;

interface DocumentRendererProps {
	snapshot: ProjectLegalSnapshot;
	/** Show document title and meta above the content */
	showHeader?: boolean;
	/** Compact mode for embedding inside other UI */
	compact?: boolean;
	style?: React.CSSProperties;
}

const statusColor: Record<ProjectLegalSnapshotStatus, string> = {
	[ProjectLegalSnapshotStatus.Active]: "green",
	[ProjectLegalSnapshotStatus.Superseded]: "default",
	[ProjectLegalSnapshotStatus.Void]: "red",
};

/**
 * Renders a ProjectLegalSnapshot document.
 * If renderedHtml is available it is used; otherwise falls back to pre-formatted markdown text.
 * Embed anywhere in the UI — project settings, onboarding flows, member invite pages, etc.
 */
export const DocumentRenderer = ({
	snapshot,
	showHeader = true,
	compact = false,
	style,
}: DocumentRendererProps) => {
	const padding = compact ? "10px 14px" : "16px 20px";
	const fontSize = compact ? 13 : 14;

	return (
		<div style={style}>
			{showHeader && (
				<div style={{ marginBottom: 12 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							marginBottom: 4,
						}}
					>
						<Title level={5} style={{ margin: 0 }}>
							{snapshot.title}
						</Title>
						<Tag color={statusColor[snapshot.status]}>{snapshot.status}</Tag>
					</div>
					<Text type="secondary" style={{ fontSize: 12 }}>
						Template v{snapshot.templateVersion}
						{snapshot.template?.context
							? ` · ${snapshot.template.context}`
							: ""}
						{snapshot.createdAt
							? ` · ${new Date(snapshot.createdAt).toLocaleDateString("en-GB", {
									day: "2-digit",
									month: "short",
									year: "numeric",
								})}`
							: ""}
					</Text>
				</div>
			)}

			{snapshot.renderedHtml ? (
				<div
					style={{
						background: "var(--ant-color-bg-container-disabled)",
						border: "0.5px solid var(--ant-color-border)",
						borderRadius: 6,
						padding,
						fontSize,
						lineHeight: 1.85,
					}}
					// renderedHtml is server-generated from trusted template — safe to render
					// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted server content
					dangerouslySetInnerHTML={{ __html: snapshot.renderedHtml }}
				/>
			) : (
				<div
					style={{
						background: "var(--ant-color-bg-container-disabled)",
						border: "0.5px solid var(--ant-color-border)",
						borderRadius: 6,
						padding,
						fontSize,
						lineHeight: 1.85,
						whiteSpace: "pre-wrap",
						fontFamily: "inherit",
					}}
				>
					{snapshot.renderedMarkdown}
				</div>
			)}
		</div>
	);
};
