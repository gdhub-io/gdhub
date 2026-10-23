"use client";

import { IconCircleCheck } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	Button,
	ConfigProvider,
	Flex,
	Form,
	Input,
	Modal,
	Typography,
} from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { IconTile } from "@/components/ui";
import { ContactTopic } from "@/config/contact";
import { productTheme } from "@/config/design";
import styles from "./style.module.scss";

type ContactForm = { email: string; subject: string; message: string };

export type ContactModalProps = {
	open: boolean;
	onClose: () => void;
	topic?: ContactTopic;
};

/**
 * Frames `u3FRP` / `xlS01` ("Write to us") and `iuuLx` / `oANfs` (Scout
 * access), with their sending, failed and sent states. Sending keeps the form
 * on screen; a failure keeps what was typed so Send can simply be pressed again.
 */
export function ContactModal({
	open,
	onClose,
	topic = ContactTopic.General,
}: ContactModalProps) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [form] = Form.useForm<ContactForm>();
	const scout = topic === ContactTopic.ScoutSpace;

	const send = useMutation({
		mutationFn: (values: ContactForm) =>
			axios.post("/api/contact", { ...values, topic }),
	});

	return (
		// A light dialog at the product's density, over the dark landing.
		<ConfigProvider
			theme={productTheme}
			input={{ variant: "filled" }}
			textArea={{ variant: "filled" }}
		>
			<Modal
				open={open}
				onCancel={onClose}
				width={480}
				destroyOnHidden
				afterClose={send.reset}
				title={
					send.isSuccess
						? undefined
						: scout
							? t(
									"landing.contact.scout.title",
									"Request access to Scout space",
								)
							: t("landing.contact.title", "Write to us")
				}
				footer={
					send.isSuccess ? (
						<Button type="primary" onClick={onClose}>
							{t("landing.contact.close", "Close")}
						</Button>
					) : (
						<Flex gap={8} justify="end">
							<Button onClick={onClose}>
								{t("landing.contact.cancel", "Cancel")}
							</Button>
							<Button
								type="primary"
								loading={send.isPending}
								onClick={() => form.submit()}
							>
								{send.isPending
									? t("landing.contact.sending", "Sending…")
									: scout
										? t("landing.contact.scout.send", "Send request")
										: t("landing.contact.send", "Send")}
							</Button>
						</Flex>
					)
				}
			>
				{send.isSuccess ? (
					<Flex vertical align="center" gap={12} className={styles.sent}>
						<IconTile
							icon={IconCircleCheck}
							size="lg"
							tint="var(--gd-success-tint)"
							ink="var(--gd-success-solid)"
						/>
						<Typography.Title level={4} className={styles.sentTitle}>
							{scout
								? t("landing.contact.scout.sent", "Request sent")
								: t("landing.contact.sent", "Message sent")}
						</Typography.Title>
						<Typography.Text type="secondary">
							{t(
								"landing.contact.sentLine",
								"Thanks! We'll reply to {email}.",
								{ email: send.variables?.email },
							)}
						</Typography.Text>
					</Flex>
				) : (
					<Form
						form={form}
						layout="vertical"
						initialValues={{
							email: session?.user?.email ?? undefined,
							subject: scout
								? t("landing.contact.scout.subject", "Access to Scout space")
								: undefined,
						}}
						requiredMark={false}
						disabled={send.isPending}
						onFinish={(values) => send.mutate(values)}
					>
						<Form.Item
							name="email"
							label={t("landing.contact.email", "Your email")}
							extra={t(
								"landing.contact.emailHint",
								"We reply to this address.",
							)}
							rules={[
								{
									required: true,
									type: "email",
									message: t(
										"landing.contact.emailInvalid",
										"Enter an email we can reply to",
									),
								},
							]}
						>
							<Input
								type="email"
								autoComplete="email"
								placeholder="you@studio.com"
							/>
						</Form.Item>
						<Form.Item
							name="subject"
							label={t("landing.contact.subject", "Subject")}
							rules={[
								{
									required: true,
									whitespace: true,
									message: t(
										"landing.contact.subjectRequired",
										"Add a subject",
									),
								},
							]}
						>
							<Input maxLength={200} readOnly={scout} />
						</Form.Item>
						<Form.Item
							name="message"
							label={t("landing.contact.message", "Message")}
							rules={[
								{
									required: true,
									whitespace: true,
									message: t(
										"landing.contact.messageRequired",
										"Write a few words",
									),
								},
							]}
						>
							<Input.TextArea
								rows={5}
								maxLength={5000}
								placeholder={
									scout
										? t(
												"landing.contact.scout.placeholder",
												"Tell us who you are — publisher, investor or angel — and what games you look for.",
											)
										: undefined
								}
							/>
						</Form.Item>
						{send.isError && (
							<Alert
								type="error"
								showIcon
								title={t(
									"landing.contact.failed",
									"Couldn't send your message. Check your connection and try again.",
								)}
							/>
						)}
					</Form>
				)}
			</Modal>
		</ConfigProvider>
	);
}
