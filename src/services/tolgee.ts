import enLocale from '@/i18n/en.json'
import ruLocale from '@/i18n/ru.json'
import { Tolgee, FormatSimple, TolgeeInstance, LanguageStorage, LanguageDetector } from '@tolgee/react'
import { InContextTools } from '@tolgee/web/tools'

declare global {
	// eslint-disable-next-line no-var
	var cachedTolgee: any
}

const tolgeeCredentials = {
	apiKey: process.env.NEXT_PUBLIC_TOLGEE_API_KEY as string,
	apiUrl: process.env.NEXT_PUBLIC_TOLGEE_API_URL as string,
	projectId: process.env.NEXT_PUBLIC_TOLGEE_PROJECT_ID as string,
}

const createTolgeeService = () => {
	const tolgee = Tolgee()

	if (process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development') {
		tolgee.use(
			InContextTools({
				credentials: tolgeeCredentials,
			})
		)
	}

	tolgee.use(FormatSimple())
	tolgee.use(LanguageDetector())

	if ('undefined' !== typeof window) {
		tolgee.use(LanguageStorage())
	}

	return tolgee.init({
		defaultLanguage: process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as string,
		availableLanguages: ['en', 'ru'],
		// for production and server
		staticData: {
			en: enLocale,
			ru: ruLocale,
		},
	})
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
