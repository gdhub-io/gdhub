import { Api } from './api'

declare global {
	// eslint-disable-next-line no-var
	var cachedBrevoApi: any
}

let brevoApi: Api<any>

function createBrevoClient() {
	return new Api({ baseApiParams: { headers: { 'api-key': process.env.BREVO_API_KEY as string } } })
}

if (process.env.NODE_ENV === 'production') {
	brevoApi = createBrevoClient()
} else {
	if (!global.cachedBrevoApi) {
		global.cachedBrevoApi = createBrevoClient()
	}

	brevoApi = global.cachedBrevoApi
}

export { brevoApi }
