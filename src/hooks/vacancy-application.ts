"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import axios from "axios";

/** The candidate's own open application to a position, as both job screens read it. */
export type MyApplication = { id: string; createdAt: string } | null;

/**
 * Withdrawing an application, asked first (frame 01.10.2). One place for the
 * job page and the position preview, so the wording and the request cannot drift.
 */
export function useWithdrawApplication(onWithdrawn: () => void) {
	const { t } = useTranslate();
	const { message, modal } = App.useApp();

	const { mutateAsync } = useMutation({
		mutationFn: (id: string) =>
			axios.put<void>("/api/user/project/vacancy/withdraw", { id }),
	});

	return (id: string) =>
		modal.confirm({
			title: t("vacancy.withdraw.confirmTitle", "Withdraw your application?"),
			content: t(
				"vacancy.withdraw.confirmBody",
				"The author will no longer see you among the candidates, and your chat about this position closes. You can apply again later.",
			),
			okText: t("vacancy.withdraw.confirmOk", "Withdraw"),
			okButtonProps: { danger: true },
			cancelText: t("vacancy.withdraw.confirmCancel", "Keep it"),
			onOk: async () => {
				try {
					await mutateAsync(id);
					message.success(
						t("vacancy.withdraw.done", "Your application is withdrawn"),
					);
					onWithdrawn();
				} catch (error: any) {
					message.error(error.response?.data.message || error.message);
				}
			},
		});
}
