"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Spin } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-black-logo.svg";
import styles from "./style.module.scss";

/**
 * Shell every invite state shares.
 *
 * The logo leads instead of a status icon: an invitee arrives here straight from
 * an email, on a page they have never seen and often without an account, so the
 * first thing it has to answer is whose page this is.
 */
function InviteScreen({
	title,
	body,
	children,
}: {
	title: string;
	body: string;
	children?: ReactNode;
}) {
	return (
		<div className={styles.page}>
			<div className={styles.column}>
				<GdhubLogo className={styles.logo} />
				<div className={styles.copy}>
					<h1 className={styles.title}>{title}</h1>
					<p className={styles.body}>{body}</p>
				</div>
				{children}
			</div>
		</div>
	);
}

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

	const goHome = (
		<div className={styles.actions}>
			<Button type="primary" block onClick={() => router.push("/")}>
				{t("page.invite.goHome", "Go Home")}
			</Button>
		</div>
	);

	if (status === "loading" || isLoadingInvitation) {
		return (
			<div className={styles.page}>
				<Spin size="large" />
			</div>
		);
	}

	if (error || invitationError) {
		return (
			<InviteScreen
				title={t(
					"page.invite.error.title",
					"We could not load this invitation",
				)}
				body={
					error ||
					t("page.invite.failedToLoadInvitation", "Failed to load invitation")
				}
			>
				{goHome}
			</InviteScreen>
		);
	}

	if (!session || !invitation?.data) return null;

	const inviteData = invitation.data;

	if (inviteData.status === "Accepted") {
		return (
			<InviteScreen
				title={t(
					"page.invite.invitationAlreadyAccepted",
					"Invitation already accepted",
				)}
				body={t(
					"page.invite.invitationAlreadyAccepted.body",
					"You are already on this team — there is nothing left to confirm.",
				)}
			>
				{goHome}
			</InviteScreen>
		);
	}

	if (inviteData.status === "Declined") {
		return (
			<InviteScreen
				title={t("page.invite.invitationDeclined", "Invitation declined")}
				body={t(
					"page.invite.invitationDeclined.body",
					"You turned this invitation down. The founder can send a new one.",
				)}
			>
				{goHome}
			</InviteScreen>
		);
	}

	if (inviteData.expiresAt && new Date() > new Date(inviteData.expiresAt)) {
		return (
			<InviteScreen
				title={t("page.invite.invitationExpired", "Invitation expired")}
				body={t(
					"page.invite.invitationExpired.body",
					"This invitation is no longer valid. Ask the founder to invite you again.",
				)}
			>
				{goHome}
			</InviteScreen>
		);
	}

	return (
		<InviteScreen
			title={t("page.invite.teamInvitation", "Team Invitation")}
			body={t(
				"page.invite.invitationText",
				"You have been invited by {inviterName} to join the team of project {projectName} as a {position}.",
				{
					inviterName: inviteData.invitedBy?.name || "Project founder",
					projectName: inviteData.team?.project?.name || "Project",
					position: inviteData.position,
				},
			)}
		>
			<p className={styles.meta}>
				{t("page.invite.startDate", "Start Date")}
				<span className={styles.metaValue}>
					{new Date(inviteData.startedAt).toLocaleDateString()}
				</span>
			</p>

			<div className={styles.actions}>
				<Button
					type="primary"
					block
					loading={isAccepting}
					onClick={() => acceptInvite()}
				>
					{t("page.invite.acceptInvitation", "Accept Invitation")}
				</Button>
				<Button block loading={isDeclining} onClick={() => declineInvite()}>
					{t("page.invite.decline", "Decline")}
				</Button>
			</div>
		</InviteScreen>
	);
}
