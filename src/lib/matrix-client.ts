import * as sdk from 'matrix-js-sdk'

export type CreateMatrixClientOptions = {
	accessToken: string
	userId: string
}

export async function createMatrixClient(opts: CreateMatrixClientOptions) {
	return sdk.createClient({
		baseUrl: process.env.NEXT_PUBLIC_MATRIX_CHAT_BASE_URL as string,
		accessToken: opts.accessToken,
		userId: opts.userId,
	})
}
