import { env } from '@helpers/env'
import fetch from 'node-fetch'

export type PaymentCryptoIntent = {
	referenceNo: string
}

type GetRateRequest = {
	invoice_currency: string
	invoice_amount: string
	currency: string
	pos_id?: string
}

type GetRateResponse = {
	invoice_currency: string
	invoice_amount: string
	currency: string
	rate: string
	amount_exchange: string
	network_processing_fee: string
	amount: string
	wait_time: string
	sid?: string
	fast_transaction_fee: string
	fast_transaction_fee_currency: string
	payment_id: string
}

type StartPaymentRequest = {
	invoice_currency: string
	invoice_amount: string
	currency: string
	payer_ip_address: string
	pos_id?: string
	reference_no?: string
	accept_zero_confirmations?: boolean
	auto_accept_underpayment?: boolean
	auto_accept_underpayment_min?: string
	payer_id?: string
	payer_user_agent?: string
	require_kyt_for_confirmation?: boolean
	wallet_app_id?: string
	payment_id?: string
	auto_accept_overpayment?: boolean
	sid?: string
}

type GetWalletAppsResponse = Array<{
	id: string
	name: string
	image: string
}>

export default class ForumpayService {
	static config = {
		userKey: env('FORUMPAY_USER_KEY'),
		secretKey: env('FORUMPAY_SECRET_KEY'),
		apiUrl: env('FORUMPAY_API_URL'),
		posId: env('FORUMPAY_POSITION'),
	}

	private static _fetch = async (requestUri: string, data: any = null) => {
		let urlQuery: string = ''

		if (data) {
			urlQuery = '?' + new URLSearchParams(data).toString()
			if (typeof data.pos_id === 'undefined') {
				urlQuery += `&pos_id=${this.config.posId}`
			}
		}

		try {
			const response = await fetch(this.config.apiUrl + requestUri + urlQuery, {
				headers: {
					Authorization: 'Basic ' + Buffer.from(this.config.userKey + ':' + this.config.secretKey).toString('base64'),
				},
				method: 'GET',
			}).then((res: any) => {
				if (process.env.NODE_ENV == 'development') {
					console.debug(
						'[FORUMPAY API]',
						this.config.apiUrl + requestUri + urlQuery,
						res.ok,
						res.status,
						res.statusText
					)
				}

				if (res.status === 204 || res.status === 201) {
					return true
				}

				return res.json()
			})

			return response
		} catch (error: any) {
			throw new Error(error.message)
		}
	}

	static async getRate(data: GetRateRequest): Promise<GetRateResponse> {
		return await this._fetch('/GetRate/', data)
	}

	static async startPayment(data: StartPaymentRequest): Promise<any> {
		return await this._fetch('/StartPayment/', data)
	}

	static async checkPayment(data: any): Promise<any> {
		return await this._fetch('/CheckPayment/', data)
	}

	static async cancelPayment(data: any): Promise<any> {
		return await this._fetch('/CancelPayment/', data)
	}

	static async getSupportedWallets(): Promise<GetWalletAppsResponse> {
		return await this._fetch('/GetWalletApps/')
	}

	static async getTransactions(data: any): Promise<any> {
		return await this._fetch('/GetTransactions/', { ...data, pos_id: '' })
	}
}
