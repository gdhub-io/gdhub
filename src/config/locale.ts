export enum AvailableLocales {
	en = "en",
	ru = "ru",
}

export const availableLocales: AvailableLocales[] = [AvailableLocales.en];

const configuredDefaultLocale = process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as
	| AvailableLocales
	| undefined;

export const defaultLocale: AvailableLocales =
	configuredDefaultLocale && availableLocales.includes(configuredDefaultLocale)
		? configuredDefaultLocale
		: AvailableLocales.en;

export const isAvailableLocale = (
	locale: string | undefined | null,
): locale is AvailableLocales => {
	if (!locale) return false;

	return availableLocales.includes(locale as AvailableLocales);
};
