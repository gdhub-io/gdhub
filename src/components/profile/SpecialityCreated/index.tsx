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

	// Проверяем, есть ли ожидающие приглашения
	const { data: user, isLoading: isLoadingUser } = useQuery({
		queryKey: ["user", "current"],
		queryFn: () => axios.get("/api/user/me"),
		enabled: !pendingInvitation, // Не запрашиваем, если есть pendingInvitation в URL
		refetchOnWindowFocus: false,
	});

	// Мутация для обработки ожидающего приглашения
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
			// В случае ошибки просто перенаправляем на страницу специализаций
			router.push("/profile/specialities");
		},
	});

	// Обрабатываем приглашение из URL параметра
	useEffect(() => {
		if (pendingInvitation && !isProcessingInvitation) {
			setIsProcessingInvitation(true);
			completePendingInvitation(pendingInvitation as string);
		}
	}, [pendingInvitation]);

	// Проверяем наличие ожидающих приглашений в профиле пользователя
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

	// Если обрабатываем приглашение, показываем спиннер
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
