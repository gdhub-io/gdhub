"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Form, Input, Segmented, Switch } from "antd";
import { ScoutType } from "@/config/prisma-enums";
import type { ScoutCabinet } from "@/repositories/scout";
import { ScoutSettingsCard } from "./ScoutSettingsCard";
import { useCabinetMutation } from "./useCabinetMutation";

const TYPE_OPTIONS = Object.values(ScoutType).map((value) => ({
	label: value,
	value,
}));

export function ScoutGeneralForm({ cabinet }: { cabinet: ScoutCabinet }) {
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const save = useCabinetMutation();

	return (
		<ScoutSettingsCard
			title={t("scout.settings.general.title", "General")}
			description={t(
				"scout.settings.general.description",
				"Basic information about your scout cabinet",
			)}
		>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				initialValues={cabinet}
				onFinish={(values) => save.mutate(values)}
			>
				<Form.Item name="type" label={t("scout.settings.type", "Scout type")}>
					<Segmented options={TYPE_OPTIONS} />
				</Form.Item>

				<Form.Item
					name="organizationName"
					label={t("scout.settings.organization", "Organization name")}
					extra={t(
						"scout.settings.organization.hint",
						"Optional for individual scouts",
					)}
				>
					<Input placeholder="e.g. Pixel Ventures" />
				</Form.Item>

				<Form.Item name="about" label={t("scout.settings.about", "About")}>
					<Input.TextArea
						rows={4}
						placeholder={t(
							"scout.settings.about.placeholder",
							"Tell developers what you're looking for and what you can offer…",
						)}
					/>
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
					extra={t(
						"scout.settings.public.hint",
						"Show your scout card to developers",
					)}
				>
					<Switch />
				</Form.Item>

				<Flex gap={8}>
					<Button type="primary" htmlType="submit" loading={save.isPending}>
						{t("scout.settings.save", "Save changes")}
					</Button>
					<Button onClick={() => form.resetFields()}>
						{t("scout.settings.cancel", "Cancel")}
					</Button>
				</Flex>
			</Form>
		</ScoutSettingsCard>
	);
}
