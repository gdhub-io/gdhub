export enum AvailableLocales {
	en = "en",
	ru = "ru",
}

export const defaultLocale =
	(process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as string) || "en";
