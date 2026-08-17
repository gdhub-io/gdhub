"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Typography } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ScoutSettingsCard } from "./ScoutSettingsCard";

const { Text } = Typography;

export function ScoutDangerZone() {
	const { t } = useTranslate();
	const { message, modal } = App.useApp();
	const queryClient = useQueryClient();
	const router = useRouter();

	const close = useMutation({
		mutationFn: () => axios.delete("/api/scout/cabinet"),
		onSuccess: () => {
			// The space gate 404s the moment the membership is gone, so leave
			// before the next render asks for a cabinet that no longer exists.
			queryClient.removeQueries({ queryKey: ["scout"] });
			message.success(
				t("scout.settings.danger.delete.done", "Scout cabinet deleted"),
			);
			router.push("/");
		},
		onError: () =>
			message.error(
				t(
					"scout.settings.danger.delete.failed",
					"Could not delete the cabinet",
				),
			),
	});

	const confirmDelete = () =>
		modal.confirm({
			title: t("scout.settings.danger.delete", "Delete scout cabinet"),
			content: t(
				"scout.settings.danger.delete.confirm",
				"Your Investment Focus, saved searches and access to the cabinet will be removed.",
			),
			okText: t("scout.settings.danger.delete.ok", "Delete cabinet"),
			okButtonProps: { danger: true },
			onOk: () => close.mutateAsync(),
		});

	return (
		<ScoutSettingsCard
			title={t("scout.settings.danger.title", "Danger zone")}
			description={t(
				"scout.settings.danger.description",
				"Close the scout cabinet",
			)}
		>
			<Flex align="center" justify="space-between" gap={16}>
				<Flex vertical>
					<Text strong>
						{t("scout.settings.danger.delete", "Delete scout cabinet")}
					</Text>
					<Text type="secondary">
						{t(
							"scout.settings.danger.delete.hint",
							"Removes the cabinet, its saved searches and your access to the scout space.",
						)}
					</Text>
				</Flex>
				<Button danger loading={close.isPending} onClick={confirmDelete}>
					{t("scout.settings.danger.delete.ok", "Delete cabinet")}
				</Button>
			</Flex>
		</ScoutSettingsCard>
	);
}
