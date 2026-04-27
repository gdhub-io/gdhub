import { FormatIcu } from "@tolgee/format-icu";
import {
	LanguageDetector,
	LanguageStorage,
	Tolgee,
	type TolgeeInstance,
} from "@tolgee/react";
import { ContextUi, InContextTools } from "@tolgee/web/tools";
import {
	type AvailableLocales,
	availableLocales,
	defaultLocale,
} from "@/config/locale";
import enLocale from "@/i18n/en.json";
import ruLocale from "@/i18n/ru.json";

declare global {
	// eslint-disable-next-line no-var
	var cachedTolgee: any;
}

const tolgeeCredentials = {
	apiKey: process.env.NEXT_PUBLIC_TOLGEE_API_KEY as string,
	apiUrl: process.env.NEXT_PUBLIC_TOLGEE_API_URL as string,
	projectId: process.env.NEXT_PUBLIC_TOLGEE_PROJECT_ID as string,
};

const createTolgeeService = () => {
	const tolgee = Tolgee();

	if (
		process.env.VERCEL_ENV === "preview" ||
		process.env.NODE_ENV === "development"
	) {
		tolgee.use(
			InContextTools({
				credentials: tolgeeCredentials,
			}),
		);
		tolgee.use(ContextUi());
	}

	tolgee.use(FormatIcu());
	tolgee.use(LanguageDetector());

	if ("undefined" !== typeof window) {
		tolgee.use(LanguageStorage());
	}

	return tolgee.init({
		defaultLanguage: defaultLocale,
		availableLanguages: availableLocales,
		// for production and server
		staticData: {
			en: enLocale,
			ru: ruLocale,
		} satisfies Record<AvailableLocales, unknown>,
	});
};

let tolgeeService: TolgeeInstance;

if (process.env.NODE_ENV === "production") {
	tolgeeService = createTolgeeService();
} else {
	if (!global.cachedTolgee) {
		global.cachedTolgee = createTolgeeService();
	}

	tolgeeService = global.cachedTolgee;
}

export { tolgeeService };
