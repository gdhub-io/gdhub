"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Modal, message, Typography } from "antd";
import axios from "axios";
import { useState } from "react";
import {
	type PermissionFeature,
	PermissionList,
} from "@/components/admin/PermissionList";
import styles from "./style.module.scss";

const { Text } = Typography;

type Props = {
	open: boolean;
	space: string;
	features: PermissionFeature[];
	onClose: () => void;
};

/** Latin, snake_case — the same shape the API enforces. */
const KEY = /^[a-z][a-z0-9_]*$/;

/**
 * Creates a narrow role inside one space: marketer, HR, moderator. The
 * permissions it may hold are exactly the catalogue of that space, so a role can
 * never grant something the space does not have.
 */
export const CustomRoleModal = ({ open, space, features, onClose }: Props) => {
	const queryClient = useQueryClient();
	const [form] = Form.useForm<{ key: string; title: string }>();
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const total = features.reduce(
		(sum, feature) => sum + feature.permissions.length,
		0,
	);

	const create = useMutation({
		mutationFn: async (values: { key: string; title: string }) =>
			axios.post("/api/admin/roles/custom", {
				space,
				key: values.key,
				title: values.title,
				permissions: [...selected],
			}),
		onSuccess: () => {
			message.success("Role created");
			queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
			close();
		},
		onError: (error) => {
			message.error(
				axios.isAxiosError(error)
					? error.response?.data?.error || "Could not create the role"
					: "Could not create the role",
			);
		},
	});

	const close = () => {
		form.resetFields();
		setSelected(new Set());
		onClose();
	};

	const toggle = (permission: string, checked: boolean) =>
		setSelected((current) => {
			const next = new Set(current);

			if (checked) next.add(permission);
			else next.delete(permission);

			return next;
		});

	return (
		<Modal
			open={open}
			onCancel={close}
			width={720}
			title={`New role · ${space}`}
			footer={[
				<Button key="cancel" onClick={close}>
					Cancel
				</Button>,
				<Button
					key="create"
					type="primary"
					loading={create.isPending}
					onClick={() => form.submit()}
				>
					Create role
				</Button>,
			]}
		>
			<div className={styles.body}>
				<Text type="secondary">
					Permissions are limited to the {space} space catalog
				</Text>

				<Form
					form={form}
					layout="vertical"
					onFinish={(values) => create.mutate(values)}
				>
					<Form.Item
						name="key"
						label="Key"
						extra="latin, snake_case; cannot be changed after creation"
						rules={[
							{ required: true, message: "A key is required" },
							{ pattern: KEY, message: "latin, snake_case" },
						]}
					>
						<Input placeholder="marketer" />
					</Form.Item>
					<Form.Item
						name="title"
						label="Title"
						extra="shown in the admin UI and in the role list"
						rules={[{ required: true, message: "A title is required" }]}
					>
						<Input placeholder="Marketer" />
					</Form.Item>
				</Form>

				<div className={styles.sectionHeader}>
					<Text strong>Permissions</Text>
					<Text type="secondary">
						{selected.size} of {total} selected
					</Text>
				</div>

				<PermissionList
					features={features}
					selected={selected}
					onToggle={toggle}
				/>
			</div>
		</Modal>
	);
};
