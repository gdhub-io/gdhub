"use client";

import { IconCheck, IconX } from "@tabler/icons-react";
import {
	Alert,
	Button,
	Card,
	Checkbox,
	message,
	Space,
	Typography,
} from "antd";
import { useState } from "react";
import type {
	LegalAcceptanceContext,
	ProjectLegalSnapshot,
} from "@/types/agreements";
import { ProjectLegalSnapshotStatus } from "@/types/agreements";
import { DocumentRenderer } from "../DocumentRenderer";

const { Text, Title } = Typography;

type ConsentState = "idle" | "accepted" | "declined";

interface AgreementConsentCardProps {
	snapshot: ProjectLegalSnapshot;
	context: LegalAcceptanceContext;
	/** Already accepted by current user */
	alreadyAccepted?: boolean;
	/** Show full document text or just a summary with a link */
	showFullDocument?: boolean;
	/** Called when user clicks Accept */
	onAccept?: (
		snapshotId: string,
		context: LegalAcceptanceContext,
	) => Promise<void>;
	/** Called when user clicks Decline */
	onDecline?: (
		snapshotId: string,
		context: LegalAcceptanceContext,
	) => Promise<void>;
	style?: React.CSSProperties;
}

/**
 * Embeddable consent card.
 * Use in: onboarding flows, invite acceptance pages, /agreement/[token] public page.
 * Renders the document + checkbox + Accept / Decline buttons.
 */
export const AgreementConsentCard = ({
	snapshot,
	context,
	alreadyAccepted = false,
	showFullDocument = true,
	onAccept,
	onDecline,
	style,
}: AgreementConsentCardProps) => {
	const [checked, setChecked] = useState(false);
	const [state, setState] = useState<ConsentState>(
		alreadyAccepted ? "accepted" : "idle",
	);
	const [loading, setLoading] = useState(false);

	const isVoid = snapshot.status === ProjectLegalSnapshotStatus.Void;

	const handleAccept = async () => {
		if (!checked) {
			void message.warning("Please confirm that you have read the document.");
			return;
		}
		setLoading(true);
		try {
			await onAccept?.(snapshot.id, context);
			setState("accepted");
			void message.success("You have accepted the agreement.");
		} finally {
			setLoading(false);
		}
	};

	const handleDecline = async () => {
		setLoading(true);
		try {
			await onDecline?.(snapshot.id, context);
			setState("declined");
			void message.info("You have declined the agreement.");
		} finally {
			setLoading(false);
		}
	};

	if (isVoid) {
		return (
			<Card style={style} size="small">
				<Alert
					type="error"
					showIcon
					message="This agreement is no longer valid."
				/>
			</Card>
		);
	}

	if (state === "accepted") {
		return (
			<Card style={style} size="small">
				<Alert
					type="success"
					showIcon
					icon={<IconCheck size={16} />}
					message={
						<Space>
							<Text strong>Agreement accepted</Text>
							<Text type="secondary">· {snapshot.title}</Text>
						</Space>
					}
				/>
			</Card>
		);
	}

	if (state === "declined") {
		return (
			<Card style={style} size="small">
				<Alert
					type="warning"
					showIcon
					icon={<IconX size={16} />}
					message={
						<Space>
							<Text strong>Agreement declined</Text>
							<Text type="secondary">· {snapshot.title}</Text>
						</Space>
					}
				/>
			</Card>
		);
	}

	return (
		<Card
			style={style}
			title={
				<Title level={5} style={{ margin: 0 }}>
					{snapshot.title}
				</Title>
			}
		>
			{showFullDocument && (
				<div style={{ marginBottom: 16 }}>
					<DocumentRenderer snapshot={snapshot} showHeader={false} compact />
				</div>
			)}

			{!showFullDocument && (
				<Alert
					type="info"
					showIcon
					message="Please review the agreement document before accepting."
					style={{ marginBottom: 16 }}
				/>
			)}

			<div
				style={{
					borderTop: "0.5px solid var(--ant-color-border)",
					paddingTop: 16,
				}}
			>
				<Checkbox
					checked={checked}
					onChange={(e) => setChecked(e.target.checked)}
					style={{ marginBottom: 16, display: "block" }}
				>
					I have read and understood the agreement, and I consent to its terms.
				</Checkbox>

				<Space>
					<Button
						type="primary"
						icon={<IconCheck size={14} />}
						loading={loading}
						disabled={!checked}
						onClick={handleAccept}
					>
						Accept
					</Button>
					<Button
						danger
						icon={<IconX size={14} />}
						loading={loading}
						onClick={handleDecline}
					>
						Decline
					</Button>
				</Space>
			</div>
		</Card>
	);
};
