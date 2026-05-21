import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Grid, Space, Spin, Typography } from "antd";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import RegistrationBgImage from "@/assets/images/registration-bg.jpg";
import { gtmEventTrigger } from "@/helpers/gtm";
import styles from "./style.module.scss";

const { Title } = Typography;

export const OnboardingCompleted = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const screens = Grid.useBreakpoint();
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
				router.push("/hub");
			}
		},
		onError: () => {
			// В случае ошибки просто перенаправляем на главную страницу
			router.push("/hub");
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

	// После проверки, что нет pendingInvitation и не идет загрузка, отправляем событие
	useEffect(() => {
		if (!isProcessingInvitation && !isCompletingInvitation && !isLoadingUser) {
			gtmEventTrigger("onboarding_complete", {});
		}
	}, [isProcessingInvitation, isCompletingInvitation, isLoadingUser]);

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
		<div
			className={`${styles.container}`}
			style={{
				backgroundImage: screens.sm
					? `url(${RegistrationBgImage.src})`
					: undefined,
			}}
		>
			<div className="onboarding-box">
				<div className="onboarding-content">
					<Space orientation="vertical" size={56}>
						<Title>
							{t(
								"onboarding.completed.title",
								"Your profile was successfully completed!",
							)}
						</Title>
						<Button
							style={{ width: "300px" }}
							onClick={() => router.push("/hub")}
						>
							{t("onboarding.completed.button", "Let&apos;s go")}
						</Button>
					</Space>
				</div>
			</div>
		</div>
	);
};
