import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Result, Spin } from "antd";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const SpecialityCreated = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { t } = useTranslate();
	const pendingInvitation = searchParams.get("pendingInvitation");
	const [isProcessingInvitation, setIsProcessingInvitation] = useState(false);

	// Check for pending invitations
	const { data: user, isLoading: isLoadingUser } = useQuery({
		queryKey: ["user", "current"],
		queryFn: () => axios.get("/api/user/me"),
		enabled: !pendingInvitation, // Skip the request when the URL carries a pendingInvitation
		refetchOnWindowFocus: false,
	});

	// Mutation that handles a pending invitation
	const {
		mutateAsync: completePendingInvitation,
		isPending: isCompletingInvitation,
	} = useMutation({
		mutationFn: (invitationId: string) =>
			axios.get(
				`/api/user/project/team/complete-pending-invitation?invitationId=${invitationId}`,
			),
		onSuccess: (response) => {
			if (response.data.redirect) {
				router.push(response.data.redirect);
			} else {
				router.push("/profile/specialities");
			}
		},
		onError: () => {
			// On error just redirect to the specialities page
			router.push("/profile/specialities");
		},
	});

	// Handle the invitation from the URL parameter
	useEffect(() => {
		if (pendingInvitation && !isProcessingInvitation) {
			setIsProcessingInvitation(true);
			completePendingInvitation(pendingInvitation as string);
		}
	}, [pendingInvitation]);

	// Check the user's profile for pending invitations
	useEffect(() => {
		if (
			user?.data &&
			user.data.pendingTeamInvitations?.length > 0 &&
			!isProcessingInvitation
		) {
			const firstPendingInvitation = user.data.pendingTeamInvitations[0];
			if (firstPendingInvitation.invitationId) {
				setIsProcessingInvitation(true);
				completePendingInvitation(firstPendingInvitation.invitationId);
			}
		}
	}, [user]);

	// Show a spinner while the invitation is being handled
	if (isProcessingInvitation || isCompletingInvitation || isLoadingUser) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
				}}
			>
				<Spin size="large" description={t("Processing your invitation...")} />
			</div>
		);
	}

	return (
		<Result
			status="success"
			title={t("Speciality Created!")}
			subTitle={t("You have successfully created a new speciality.")}
			extra={[
				<Button
					type="primary"
					key="specialities"
					onClick={() => router.push("/profile/specialities")}
				>
					{t(
						"profile.specialityCreated.viewYourSpecialities",
						"View Your Specialities",
					)}
				</Button>,
			]}
		/>
	);
};
