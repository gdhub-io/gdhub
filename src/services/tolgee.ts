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

	// In-context translation editor — opt-in to avoid CORS errors against
	// the Tolgee server during local dev. Set NEXT_PUBLIC_TOLGEE_IN_CONTEXT=true
	// in .env.local when you want to use it (also requires the Tolgee server
	// to allow your dev origin).
	if (process.env.NEXT_PUBLIC_TOLGEE_IN_CONTEXT === "true") {
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
		// English renders on the server and on first paint, so it ships with the
		// bundle; any other language is fetched only once someone switches to it.
		staticData: {
			en: enLocale,
			ru: () => import("@/i18n/ru.json").then((module) => module.default),
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
