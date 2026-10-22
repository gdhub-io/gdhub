"use client";

import { useTranslate } from "@tolgee/react";
import { App, Form, Input, Modal, Typography } from "antd";
import type { WaitlistFeature } from "@/config/prisma-enums";
import { useWriteToWaitlist } from "@/hooks/feature-waitlist";

type Values = { title: string; message: string };

export type WriteToWaitlistModalProps = {
	open: boolean;
	feature: WaitlistFeature;
	/** The rows chosen; everyone on the list when empty. */
	ids: string[];
	/** How many get the letter, and how many are on the list. */
	count: number;
	total: number;
	onClose: () => void;
	onSent: () => void;
};

/** Frame 13.8a (`ph1aX`): a letter to the bell and by email. */
export function WriteToWaitlistModal({
	open,
	feature,
	ids,
	count,
	total,
	onClose,
	onSent,
}: WriteToWaitlistModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [form] = Form.useForm<Values>();
	const write = useWriteToWaitlist();

	const submit = (values: Values) =>
		write.mutate(
			{ feature, ids: ids.length ? ids : undefined, ...values },
			{
				onSuccess: ({ sent, failed }) => {
					if (failed) {
						message.warning(
							t(
								"admin.waitlist.write.partly",
								"Sent to {sent}, {failed} could not be reached",
								{ sent, failed },
							),
						);
					} else {
						message.success(
							t("admin.waitlist.write.sent", "Sent to {sent}", { sent }),
						);
					}
					onSent();
				},
				onError: () =>
					message.error(
						t("admin.waitlist.write.failed", "Couldn't send. Try again."),
					),
			},
		);

	return (
		<Modal
			open={open}
			title={t(
				"admin.waitlist.write.title",
				"{count, plural, one {Write to # person} other {Write to # people}}",
				{ count },
			)}
			okText={t(
				"admin.waitlist.write.submit",
				"{count, plural, one {Send to #} other {Send to #}}",
				{ count },
			)}
			cancelText={t("common.cancel", "Cancel")}
			confirmLoading={write.isPending}
			onOk={() => form.submit()}
			onCancel={onClose}
			destroyOnHidden
		>
			<Form<Values>
				form={form}
				layout="vertical"
				variant="filled"
				requiredMark={false}
				onFinish={submit}
			>
				<Form.Item
					name="title"
					label={t("admin.waitlist.write.titleLabel", "Title")}
					extra={t(
						"admin.waitlist.write.titleHelp",
						"The bell's heading and the email's subject",
					)}
					rules={[{ required: true, whitespace: true, max: 120 }]}
				>
					<Input maxLength={120} />
				</Form.Item>
				<Form.Item
					name="message"
					label={t("admin.waitlist.write.messageLabel", "Message")}
					rules={[{ required: true, whitespace: true, max: 2000 }]}
				>
					<Input.TextArea rows={5} maxLength={2000} showCount />
				</Form.Item>
				<Typography.Text type="secondary">
					{t(
						"admin.waitlist.write.help",
						"Sent to the bell and by email, with a button to start a checkpoint. {count} of {total} on the list.",
						{ count, total },
					)}
				</Typography.Text>
			</Form>
		</Modal>
	);
}
