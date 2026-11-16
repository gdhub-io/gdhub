"use client";

import { IconPencil } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Form, Input, Popover } from "antd";
import { useState } from "react";
import { roleIcon, type StudioPerson } from "./use-studio";

type Values = { name: string; role: string };

/** Frame 03.15.4 (`fBKWu`): the pencil after a name opens name and role. */
export function EditPersonPopover({
	person,
	onSave,
}: {
	person: StudioPerson;
	onSave: (name: string, role: string) => void;
}) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(false);
	const [form] = Form.useForm<Values>();
	const Role = roleIcon(person.direction);

	const save = ({ name, role }: Values) => {
		onSave(name.trim(), role.trim());
		setOpen(false);
	};

	const content = (
		<Form
			form={form}
			layout="vertical"
			variant="filled"
			requiredMark={false}
			onFinish={save}
			style={{ width: 280 }}
		>
			<Form.Item
				name="name"
				label={t("live.sborka.displayName", "Display name")}
				rules={[{ required: true, whitespace: true }]}
			>
				<Input maxLength={60} />
			</Form.Item>
			<Form.Item
				name="role"
				label={t("live.sborka.role", "Role")}
				extra={t(
					"live.sborka.roleHelp",
					"Both show in the call and on the broadcast.",
				)}
			>
				<Input prefix={<Role size={16} />} maxLength={60} />
			</Form.Item>
			<Flex justify="end" gap={8}>
				<Button onClick={() => setOpen(false)}>
					{t("live.sborka.cancel", "Cancel")}
				</Button>
				<Button type="primary" htmlType="submit">
					{t("live.sborka.save", "Save")}
				</Button>
			</Flex>
		</Form>
	);

	return (
		<Popover
			trigger="click"
			open={open}
			onOpenChange={(next) => {
				if (next) form.setFieldsValue({ name: person.name, role: person.role });
				setOpen(next);
			}}
			content={content}
			destroyOnHidden
		>
			<Button
				type="text"
				size="small"
				aria-label={t("live.sborka.edit", "Edit name and role")}
				icon={<IconPencil size={14} />}
			/>
		</Popover>
	);
}
