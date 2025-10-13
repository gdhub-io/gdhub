import { useEffect, useState } from "react";

type TelegramWebApp = {
	[key: string]: any;
};

declare global {
	interface Window {
		Telegram: {
			WebApp: TelegramWebApp;
		};
	}
}

export const useTelegram = () => {
	const [app, setApp] = useState<TelegramWebApp | null>(null);
	const [isOpenedInTelegram, setIsOpenedInTelegram] = useState<boolean>(false);

	useEffect(() => {
		if (
			typeof window !== "undefined" &&
			typeof window.Telegram !== "undefined" &&
			typeof window.Telegram.WebApp !== "undefined"
		) {
			setApp(window.Telegram.WebApp);
			setIsOpenedInTelegram(window.Telegram.WebApp.initData.length > 0);

			window.Telegram.WebApp.expand();
		}

		return () => {
			setApp(null);
			setIsOpenedInTelegram(false);
		};
	}, []);

	return [isOpenedInTelegram, app?.initDataUnsafe.user, app];
};
