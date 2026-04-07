import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Alert, Button, Card, Checkbox, Result, Spin, Typography } from "antd";
import axios, { type AxiosError } from "axios";
import Head from "next/head";
import { useRouter } from "next/router";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import ProjectLegalPreviewModal from "@/components/legal/ProjectLegalPreviewModal";
import {
	DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
	DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
	DEFAULT_MENTOR_FUND_SHARE,
	PLATFORM_SHARE_PERCENT,
} from "@/config/legal";

const { Title, Text, Paragraph } = Typography;

const InvitePage = () => {
	const router = useRouter();
	const { token } = router.query;
	const { t } = useTranslate();
	const { data: session, status } = useSession();
	const [error, setError] = useState<string | null>(null);
	const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
	const [showAgreementPreview, setShowAgreementPreview] = useState(false);

	// Получаем информацию о приглашении
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

	// Мутация для принятия приглашения
	const { mutateAsync: acceptInvite, isPending: isAccepting } = useMutation({
		mutationFn: () =>
			axios.get(`/api/user/project/team/accept-invite?token=${token}`),
		onSuccess: (response) => {
			if (response.data.redirect) {
				router.push(response.data.redirect);
			}
		},
		onError: (err: AxiosError<{ message?: string }>) => {
			setError(err.response?.data?.message || "Failed to accept invitation");
		},
	});

	// Мутация для отклонения приглашения
	const { mutateAsync: declineInvite, isPending: isDeclining } = useMutation({
		mutationFn: () =>
			axios.get(`/api/user/project/team/decline-invite?token=${token}`),
		onSuccess: () => {
			router.push("/");
		},
		onError: (err: AxiosError<{ message?: string }>) => {
			setError(err.response?.data?.message || "Failed to decline invitation");
		},
	});

	// Если пользователь не авторизован, перенаправляем на страницу входа
	useEffect(() => {
		if (status === "unauthenticated" && token) {
			signIn(undefined, { callbackUrl: `/invite/${token}` });
		}
	}, [status, token]);

	// Обработчик принятия приглашения
	const handleAccept = () => {
		acceptInvite();
	};

	// Обработчик отклонения приглашения
	const handleDecline = () => {
		declineInvite();
	};

	// Если идет загрузка сессии или приглашения
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

	// Если произошла ошибка
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

	// Если пользователь авторизован и приглашение загружено
	if (session && invitation?.data) {
		const inviteData = invitation.data;
		const usesCoDevelopmentAgreement = Boolean(
			inviteData.team?.project?.usesCoDevelopmentAgreement ??
				inviteData.team?.project?.agree,
		);

		// Проверяем статус приглашения
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
			<>
				<Head>
					<title>{t("Team Invitation")}</title>
				</Head>
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
						{usesCoDevelopmentAgreement ? (
							<Alert
								type="info"
								showIcon
								message={t(
									"page.invite.legalTitle",
									"Legal confirmation required",
								)}
								description={
									<>
										<Paragraph style={{ marginBottom: 8 }}>
											{t(
												"page.invite.legalDescription",
												"By accepting this invitation you join the project under the co-development agreement used by the platform.",
											)}
										</Paragraph>
										<Button
											type="link"
											style={{ paddingInline: 0 }}
											onClick={() => setShowAgreementPreview(true)}
										>
											{t("page.invite.openAgreement", "Preview agreement")}
										</Button>
										<Checkbox
											checked={acceptedLegalTerms}
											onChange={(event) =>
												setAcceptedLegalTerms(event.target.checked)
											}
										>
											{t(
												"page.invite.legalConfirm",
												"I have read and agree to the co-development agreement.",
											)}
										</Checkbox>
									</>
								}
								style={{ marginTop: 16 }}
							/>
						) : null}
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
							<Button
								type="primary"
								onClick={handleAccept}
								loading={isAccepting}
								disabled={usesCoDevelopmentAgreement && !acceptedLegalTerms}
							>
								{t("page.invite.acceptInvitation", "Accept Invitation")}
							</Button>
						</div>
						<ProjectLegalPreviewModal
							open={showAgreementPreview}
							onClose={() => setShowAgreementPreview(false)}
							showProjectAppendix
							appendixInput={{
								projectName: inviteData.team?.project?.name || "Project",
								projectId: inviteData.team?.project?.id,
								projectSlug: inviteData.team?.project?.slug,
								platformShare:
									inviteData.team?.project?.equity?.platformShare ??
									PLATFORM_SHARE_PERCENT,
								mentorFundShare:
									inviteData.team?.project?.equity?.mentorFundShare ??
									DEFAULT_MENTOR_FUND_SHARE,
								damageCompensationEnabled:
									inviteData.team?.project?.damageCompensationEnabled ?? true,
								damageCompensationAmount:
									inviteData.team?.project?.damageCompensationAmount ??
									DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
								damageCompensationCurrency:
									inviteData.team?.project?.damageCompensationCurrency ??
									DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
							}}
						/>
					</Card>
				</div>
			</>
		);
	}

	return null;
};

export default InvitePage;
