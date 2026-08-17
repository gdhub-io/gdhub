import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import axios from "axios";
import type { CabinetUpdate, ScoutCabinet } from "@/repositories/scout";

/** Saves a slice of the cabinet and refreshes the copy the screens read. */
export function useCabinetMutation() {
	const queryClient = useQueryClient();
	const { message } = App.useApp();
	const { t } = useTranslate();

	return useMutation({
		mutationFn: (data: CabinetUpdate) =>
			axios
				.put<ScoutCabinet>("/api/scout/cabinet", data)
				.then((res) => res.data),
		onSuccess: (cabinet) => {
			queryClient.setQueryData(["scout", "cabinet"], cabinet);
			message.success(t("scout.settings.saved", "Settings saved"));
		},
		onError: () =>
			message.error(t("scout.settings.saveFailed", "Could not save settings")),
	});
}
