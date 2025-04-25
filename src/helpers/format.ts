import { AvailableLocales } from '@/config/locale'
import { NextApiRequest } from 'next'

export const isValidJSON = (text: any) => {
	if (typeof text !== 'string') {
		return false
	}
	try {
		JSON.parse(text)
		return true
	} catch (error) {
		return false
	}
}

export function formatNestedJson(obj: any, parentKey = '', output = '') {
	if (Array.isArray(obj)) {
		obj.forEach((item, index) => {
			const key = `${parentKey}[${index}]`
			if (typeof item === 'object' && item !== null && item instanceof Date === false) {
				output = formatNestedJson(item, key, output)
			} else {
				if (item instanceof Date) {
					item = item.toISOString()
				}

				output += `${key}: ${item}\n`
			}
		})
	} else {
		Object.entries(obj).forEach(([key, value]) => {
			const fullKey = parentKey ? `${parentKey}.${key}` : key

			if (typeof value === 'object' && value !== null && value instanceof Date === false) {
				output = formatNestedJson(value, fullKey, output)
			} else {
				if (value instanceof Date) {
					value = value.toISOString()
				}

				output += `${fullKey}: ${value}\n`
			}
		})
	}

	return output
}

export const getServerLocale = (req: NextApiRequestWithUser | NextApiRequest) => {
	let locale = AvailableLocales.en

	const acceptLanguage = req.headers['accept-language']

	if (acceptLanguage) {
		const [availabeLocales] = acceptLanguage?.split(';')
		const fullLocale = availabeLocales?.split(',')[1]
		const shortLocale = fullLocale?.split('-')[0]

		// check allowed locales
		if (shortLocale && Object.values(AvailableLocales).includes(shortLocale as any)) {
			locale = shortLocale as AvailableLocales
		}
	}

	return locale
}
