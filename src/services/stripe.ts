import { env } from '@helpers/env'
import { NextApiRequest } from 'next'
import getRawBody from 'raw-body'
import countryList from 'react-select-country-list'
import Stripe from 'stripe'

const STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_ENDPOINT_SECRET = env('STRIPE_WEBHOOK_ENDPOINT_SECRET')
const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2022-08-01',
})

export type PaymentCreditCardIntent = {
	clientSecret: string
}

export class StripeService {
	static findOrCreateCustomer = async ({
		country,
		email,
		fullName,
		metadata,
	}: {
		country: string
		email: string
		fullName: string
		metadata?: any
	}): Promise<Stripe.Response<Stripe.Customer> | undefined> => {
		try {
			let searchResponse: any = await stripe.customers.search({ query: `email:"${email}"` })

			if (searchResponse.data.length === 0) {
				return await stripe.customers.create({
					address: { country: countryList().getValue(country) },
					email,
					name: fullName,
					metadata,
				})
			} else {
				return searchResponse.data[0]
			}
		} catch (error: any) {
			console.log(error)
			return
		}
	}

	static createPaymentIntent = async ({ amount, currency = 'usd', customerId, metadata }: any) => {
		return await stripe.paymentIntents.create({
			amount, // convert dollars to cent
			currency,
			automatic_payment_methods: { enabled: true },
			customer: customerId,
			metadata,
		})
	}

	static getWebhookEvent = async (request: NextApiRequest) => {
		const reqBuffer = await getRawBody(request)
		const signature = request.headers['stripe-signature'] as string

		return stripe.webhooks.constructEvent(reqBuffer, signature, STRIPE_WEBHOOK_ENDPOINT_SECRET)
	}
}
