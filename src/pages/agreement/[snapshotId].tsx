import { Alert, Card, Result, Spin, Typography } from "antd";
import Head from "next/head";
import { useRouter } from "next/router";
import { AgreementConsentCard } from "@/components/agreements/AgreementConsentCard";
import { MOCK_SNAPSHOTS } from "@/mocks/agreements";
import { LegalAcceptanceContext } from "@/types/agreements";

const { Title, Text } = Typography;

/**
 * Public-facing agreement review page.
 * Linked from notification emails so members can review and accept/decline
 * changes to project documents without having to navigate the app.
 *
 * Route: /agreement/[snapshotId]
 */
const AgreementReviewPage = () => {
	const router = useRouter();
	const { snapshotId } = router.query;

	// TODO: replace with real API call
	const snapshot = MOCK_SNAPSHOTS.find((s) => s.id === snapshotId);

	if (router.isFallback || !snapshotId) {
		return (
			<div
				style={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Spin size="large" />
			</div>
		);
	}

	if (!snapshot) {
		return (
			<div
				style={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 24,
				}}
			>
				<Result
					status="404"
					title="Agreement not found"
					subTitle="This link may be invalid or expired."
				/>
			</div>
		);
	}

	const handleAccept = async (id: string, context: LegalAcceptanceContext) => {
		// TODO: POST /api/agreements/accept
		console.log("Accept", id, context);
	};

	const handleDecline = async (id: string, context: LegalAcceptanceContext) => {
		// TODO: POST /api/agreements/decline
		console.log("Decline", id, context);
	};

	return (
		<>
			<Head>
				<title>{snapshot.title} — Review Agreement</title>
			</Head>
			<div
				style={{
					minHeight: "100vh",
					background: "var(--ant-color-bg-layout, #f5f5f5)",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					padding: "40px 16px",
				}}
			>
				<div style={{ width: "100%", maxWidth: 680 }}>
					<div style={{ textAlign: "center", marginBottom: 32 }}>
						<Title level={3} style={{ marginBottom: 4 }}>
							Agreement Review
						</Title>
						<Text type="secondary">
							Please review the document below and confirm your decision.
						</Text>
					</div>

					<AgreementConsentCard
						snapshot={snapshot}
						context={LegalAcceptanceContext.InviteJoin}
						showFullDocument
						onAccept={handleAccept}
						onDecline={handleDecline}
					/>

					<div style={{ textAlign: "center", marginTop: 24 }}>
						<Text type="secondary" style={{ fontSize: 12 }}>
							This link is unique to you. Please do not share it.
						</Text>
					</div>
				</div>
			</div>
		</>
	);
};

export default AgreementReviewPage;
