import enLocale from '@/i18n/en.json'
import ruLocale from '@/i18n/ru.json'
import { DevTools, Tolgee, FormatSimple, TolgeeInstance, LanguageStorage } from '@tolgee/react'

declare global {
	// eslint-disable-next-line no-var
	var cachedTolgee: any
}

const createTolgeeService = () => {
	const tolgee = Tolgee()
		.use(DevTools())
		.use(FormatSimple())
		.use(LanguageStorage())
		.init({
			defaultLanguage: process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as string,
			availableLanguages: ['en', 'ru'],
			// for dev mode
			apiKey: process.env.NEXT_PUBLIC_TOLGEE_API_KEY as string,
			apiUrl: process.env.NEXT_PUBLIC_TOLGEE_API_URL as string,
			projectId: process.env.NEXT_PUBLIC_TOLGEE_PROJECT_ID as string,
			// for production and server
			staticData: {
				en: enLocale,
				ru: ruLocale,
			},
		})

	return tolgee
}

let tolgeeService: TolgeeInstance

if (process.env.NODE_ENV === 'production') {
	tolgeeService = createTolgeeService()
} else {
	if (!global.cachedTolgee) {
		global.cachedTolgee = createTolgeeService()
	}

	tolgeeService = global.cachedTolgee
}

export { tolgeeService }
