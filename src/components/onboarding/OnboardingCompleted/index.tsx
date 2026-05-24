import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Space, Spin, Typography } from "antd";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { gtmEventTrigger } from "@/helpers/gtm";

const { Paragraph, Title } = Typography;

export const OnboardingCompleted = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { t } = useTranslate();
	const pendingInvitation = searchParams.get("pendingInvitation");
	const [isProcessingInvitation, setIsProcessingInvitation] = useState(
		!!pendingInvitation,
	);

	const { data: user } = useQuery({
		queryKey: ["user", "current"],
		queryFn: () => axios.get("/api/user/me"),
		enabled: !pendingInvitation,
		refetchOnWindowFocus: false,
	});

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
				router.push("/hub");
			}
		},
		onError: () => {
			router.push("/hub");
		},
	});

	useEffect(() => {
		if (pendingInvitation && !isCompletingInvitation) {
			setIsProcessingInvitation(true);
			completePendingInvitation(pendingInvitation as string);
		}
	}, [pendingInvitation]);

	useEffect(() => {
		if (
			user?.data &&
			user.data.pendingTeamInvitations?.length > 0 &&
			!isProcessingInvitation
		) {
			const firstInvitation = user.data.pendingTeamInvitations[0];
			if (firstInvitation.invitationId) {
				setIsProcessingInvitation(true);
				completePendingInvitation(firstInvitation.invitationId);
			}
		}
	}, [user]);

	useEffect(() => {
		if (!isProcessingInvitation && !isCompletingInvitation) {
			gtmEventTrigger("onboarding_complete", {});
		}
	}, [isProcessingInvitation, isCompletingInvitation]);

	if (isProcessingInvitation || isCompletingInvitation) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					minHeight: 300,
				}}
			>
				<Spin
					size="large"
					tip={t(
						"onboarding.completed.processingInvitation",
						"Processing your invitation...",
					)}
				/>
			</div>
		);
	}

	return (
		<Space direction="vertical" size={32} align="center">
			<Title>
				{t(
					"onboarding.completed.title",
					"Your profile was successfully completed!",
				)}
			</Title>
			<Paragraph style={{ maxWidth: 560 }}>
				{t(
					"onboarding.completed.description",
					"Welcome aboard. You can now explore projects, teams and opportunities tailored to your interests.",
				)}
			</Paragraph>
			<Button
				type="primary"
				size="large"
				style={{ width: 300, maxWidth: "100%" }}
				onClick={() => router.push("/hub")}
			>
				{t("onboarding.completed.button", "Let's go")}
			</Button>
		</Space>
	);
};
