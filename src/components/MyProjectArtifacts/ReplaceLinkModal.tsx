"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Form, Input, Modal } from "antd";
import axios from "axios";
import type { ArtifactListItem } from "./artifacts";

/** A new link for an artifact that could not be opened; it is checked again on save. */
export function ReplaceLinkModal({
	artifact,
	onClose,
	onReplaced,
}: {
	artifact: ArtifactListItem | null;
	onClose: () => void;
	onReplaced: () => void;
}) {
	const { t } = useTranslate();
	const [form] = Form.useForm<{ link: string }>();

	const replace = useMutation({
		mutationFn: ({ link }: { link: string }) =>
			axios.put(`/api/user/project/artifacts/${artifact?.id}`, { link }),
		onSuccess: onReplaced,
	});

	return (
		<Modal
			open={!!artifact}
			title={t("artifacts.replace.title", "Replace the link")}
			okText={t("artifacts.replace.save", "Save and check")}
			cancelText={t("artifacts.replace.cancel", "Cancel")}
			confirmLoading={replace.isPending}
			onOk={() => form.submit()}
			onCancel={onClose}
			destroyOnHidden
		>
			<Form
				form={form}
				layout="vertical"
				requiredMark={false}
				initialValues={{ link: artifact?.link }}
				onFinish={(values) => replace.mutate(values)}
			>
				<Form.Item
					name="link"
					label={artifact?.name || t("artifacts.replace.label", "Link")}
					rules={[
						{
							required: true,
							type: "url",
							message: t(
								"artifacts.replace.invalid",
								"Paste a full link, starting with https://",
							),
						},
					]}
				>
					<Input autoFocus placeholder="https://" />
				</Form.Item>
			</Form>
		</Modal>
	);
}
