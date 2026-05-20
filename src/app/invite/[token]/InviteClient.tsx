"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Card, Result, Spin, Typography } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

export function InviteClient({ token }: { token: string }) {
	const router = useRouter();
	const { t } = useTranslate();
	const { data: session, status } = useSession();
	const [error, setError] = useState<string | null>(null);

	const {
		data: invitation,
		isLoading: isLoadingInvitation,
		error: invitationError,
	} = useQuery({
		queryKey: ["invitation", token],
		queryFn: () => axios.get(`/api/invitation/${token}`),
		enabled: !!token,
		retry: false,
	});

	useEffect(() => {
		if (invitationError) {
			setError(invitationError.message || "Failed to load invitation");
		}
	}, [invitationError]);

	const { mutateAsync: acceptInvite, isPending: isAccepting } = useMutation({
		mutationFn: () =>
			axios.get(`/api/user/project/team/accept-invite?token=${token}`),
		onSuccess: (response) => {
			if (response.data.redirect) {
				router.push(response.data.redirect);
			}
		},
		onError: (err: any) => {
			setError(err.response?.data?.message || "Failed to accept invitation");
		},
	});

	const { mutateAsync: declineInvite, isPending: isDeclining } = useMutation({
		mutationFn: () =>
			axios.get(`/api/user/project/team/decline-invite?token=${token}`),
		onSuccess: () => {
			router.push("/");
		},
		onError: (err: any) => {
			setError(err.response?.data?.message || "Failed to decline invitation");
		},
	});

	useEffect(() => {
		if (status === "unauthenticated" && token) {
			signIn(undefined, { callbackUrl: `/invite/${token}` });
		}
	}, [status, token]);

	const handleAccept = () => {
		acceptInvite();
	};

	const handleDecline = () => {
		declineInvite();
	};

	if (status === "loading" || isLoadingInvitation) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
				}}
			>
				<Spin size="large" />
			</div>
		);
	}

	if (error || invitationError) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					padding: "20px",
				}}
			>
				<Card style={{ maxWidth: 600, width: "100%" }}>
					<Result
						status="error"
						title={t("page.invite.error", "Error")}
						subTitle={
							error ||
							t(
								"page.invite.failedToLoadInvitation",
								"Failed to load invitation",
							)
						}
						extra={[
							<Button
								key="home"
								type="primary"
								onClick={() => router.push("/")}
							>
								{t("page.invite.goHome", "Go Home")}
							</Button>,
						]}
					/>
				</Card>
			</div>
		);
	}

	if (session && invitation?.data) {
		const inviteData = invitation.data;

		if (inviteData.status === "Accepted") {
			return (
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
						padding: "20px",
					}}
				>
					<Card style={{ maxWidth: 600, width: "100%" }}>
						<Result
							status="info"
							title={t(
								"page.invite.invitationAlreadyAccepted",
								"Invitation Already Accepted",
							)}
							subTitle={t(
								"page.invite.invitationAlreadyAcceptedSubtitle",
								"This invitation has already been accepted.",
							)}
							extra={[
								<Button
									key="home"
									type="primary"
									onClick={() => router.push("/")}
								>
									{t("page.invite.goHome", "Go Home")}
								</Button>,
							]}
						/>
					</Card>
				</div>
			);
		}

		if (inviteData.status === "Declined") {
			return (
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
						padding: "20px",
					}}
				>
					<Card style={{ maxWidth: 600, width: "100%" }}>
						<Result
							status="warning"
							title={t("page.invite.invitationDeclined", "Invitation Declined")}
							subTitle={t(
								"page.invite.invitationDeclinedSubtitle",
								"This invitation has been declined.",
							)}
							extra={[
								<Button
									key="home"
									type="primary"
									onClick={() => router.push("/")}
								>
									{t("page.invite.goHome", "Go Home")}
								</Button>,
							]}
						/>
					</Card>
				</div>
			);
		}

		if (inviteData.expiresAt && new Date() > new Date(inviteData.expiresAt)) {
			return (
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100vh",
						padding: "20px",
					}}
				>
					<Card style={{ maxWidth: 600, width: "100%" }}>
						<Result
							status="warning"
							title={t("page.invite.invitationExpired", "Invitation Expired")}
							subTitle={t(
								"page.invite.invitationExpiredSubtitle",
								"This invitation has expired.",
							)}
							extra={[
								<Button
									key="home"
									type="primary"
									onClick={() => router.push("/")}
								>
									{t("page.invite.goHome", "Go Home")}
								</Button>,
							]}
						/>
					</Card>
				</div>
			);
		}

		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
					padding: "20px",
				}}
			>
				<Card style={{ maxWidth: 600, width: "100%" }}>
					<Title level={2}>
						{t("page.invite.teamInvitation", "Team Invitation")}
					</Title>
					<Paragraph>
						{t(
							"page.invite.invitationText",
							"You have been invited by {inviterName} to join the team of project {projectName} as a {position}.",
							{
								inviterName: inviteData.invitedBy?.name || "Project founder",
								projectName: inviteData.team?.project?.name || "Project",
								position: inviteData.position,
							},
						)}
					</Paragraph>
					<Paragraph>
						<Text strong>{t("page.invite.startDate", "Start Date")}:</Text>{" "}
						{new Date(inviteData.startedAt).toLocaleDateString()}
					</Paragraph>
					<div
						style={{
							marginTop: 24,
							display: "flex",
							justifyContent: "space-between",
						}}
					>
						<Button onClick={handleDecline} loading={isDeclining}>
							{t("page.invite.decline", "Decline")}
						</Button>
						<Button type="primary" onClick={handleAccept} loading={isAccepting}>
							{t("page.invite.acceptInvitation", "Accept Invitation")}
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	return null;
}
