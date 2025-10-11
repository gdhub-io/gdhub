import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Card, Divider, Flex, Form, message, Spin, Typography } from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import TelegramReactAuthButton, { type TelegramLoggedUser } from "telegram-react-auth-button";

const { Text } = Typography;

type ConnectProfileFormArgs = {
	profile: prismaClient.Profile;
	saveProfile: (data: Partial<prismaClient.Profile>) => Promise<void>;
};

const ConnectProfileForm = ({ profile, saveProfile }: ConnectProfileFormArgs) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const [processing, setProcessing] = useState(false);
	const { data: session, update: sessionUpdate } = useSession();

	const { mutateAsync: addSocialConnection } = useMutation({
		mutationFn: ({ telegram }: { telegram: { id: string } }) =>
			axios.post<any>("/api/user/connection", { telegram }),
		onSuccess: sessionUpdate,
	});

	const { mutateAsync: removeSocialConnection } = useMutation({
		mutationFn: ({ telegram }: { telegram: boolean }) =>
			axios.put<any>("/api/user/connection", { telegram }),
		onSuccess: sessionUpdate,
	});

	const handleConnectToTelegram = async (response: TelegramLoggedUser) => {
		await addSocialConnection({ telegram: { id: response.id.toString() } });
		message.success("Your Telegram account is connected");
	};

	const handleDisconnectToTelegram = async () => {
		await removeSocialConnection({ telegram: true });
		message.success("Your Telegram account is disconnected");
	};

	useEffect(() => {
		console.log("session", session);
	}, [session]);

	return (
		<Card
			title={t("components.profile-forms.connect.card.title", "Telegram connection")}
			bordered={false}
		>
			<Spin spinning={processing}>
				{session?.user.telegramId ? (
					<Flex justify="space-between">
						<Text>
							{t(
								"components.profile-forms.connect.card.yourTelegramAccountIsConnected",
								"Your Telegram account is connected",
							)}
						</Text>
						<Button onClick={handleDisconnectToTelegram} size="small" danger>
							{t("components.profile-forms.connect.card.disconnect", "Disconnect")}
						</Button>
					</Flex>
				) : (
					<TelegramReactAuthButton
						botName={process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME as string}
						onAuth={handleConnectToTelegram}
						size="large"
						cornerRadius={4}
						showUserPhoto={false}
						requestAccessToWrite={true}
					/>
				)}
			</Spin>
			<Divider />
			<Text type="secondary">
				{t(
					"components.profile-forms.connect.card.description",
					"Connecting to Telegram will allow you to request advice from community mentors through the app",
				)}{" "}
				<Link href={"https://t.me/gdhub_experts_bot"} target="_blank">
					{t(
						"components.profile-forms.connect.card.application.experts.name",
						"Mentors from gamedev",
					)}
				</Link>
				.
			</Text>
		</Card>
	);
};

export default ConnectProfileForm;
