"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Form, Input, Modal, Segmented, Select, Switch } from "antd";
import axios from "axios";
import { ScoutType } from "@/config/prisma-enums";
import { useUserSearch } from "@/hooks/user-search";

const TYPE_OPTIONS = Object.values(ScoutType).map((value) => ({
	label: value,
	value,
}));

/** Creates a scout: the cabinet and the access to it, from one form. */
export function NewScoutModal({
	open,
	onCancel,
}: {
	open: boolean;
	onCancel: () => void;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [form] = Form.useForm();
	const queryClient = useQueryClient();

	const userSearch = useUserSearch(open);

	const create = useMutation({
		mutationFn: (values: Record<string, unknown>) =>
			axios.post("/api/admin/scouts", values),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin", "scouts"] });
			form.resetFields();
			onCancel();
			message.success(t("admin.scouts.created", "Scout created"));
		},
		onError: () =>
			message.error(t("admin.scouts.createFailed", "Could not create scout")),
	});

	return (
		<Modal
			open={open}
			title={t("admin.scouts.new", "New scout")}
			okText={t("admin.scouts.create", "Create scout")}
			confirmLoading={create.isPending}
			onOk={() => form.submit()}
			onCancel={onCancel}
			destroyOnHidden
		>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				initialValues={{ type: ScoutType.Angel, isPublic: false }}
				onFinish={(values) => create.mutate(values)}
			>
				<Form.Item
					name="userId"
					label={t("admin.scouts.representative", "Representative")}
					rules={[{ required: true }]}
				>
					<Select
						{...userSearch}
						placeholder={t(
							"admin.scouts.representative.placeholder",
							"Search for a user by name or email",
						)}
					/>
				</Form.Item>

				<Form.Item
					name="type"
					label={t("scout.settings.type", "Scout type")}
					rules={[{ required: true }]}
				>
					<Segmented options={TYPE_OPTIONS} />
				</Form.Item>

				<Form.Item
					name="organizationName"
					label={t("scout.settings.organization", "Organization name")}
				>
					<Input placeholder="e.g. Pixel Ventures" />
				</Form.Item>

				<Form.Item name="about" label={t("scout.settings.about", "About")}>
					<Input.TextArea rows={3} />
				</Form.Item>

				<Form.Item
					name="website"
					label={t("scout.settings.website", "Website")}
				>
					<Input placeholder="https://…" />
				</Form.Item>

				<Form.Item
					name="isPublic"
					valuePropName="checked"
					label={t("scout.settings.public", "Public scout card")}
				>
					<Switch />
				</Form.Item>
			</Form>
		</Modal>
	);
}
