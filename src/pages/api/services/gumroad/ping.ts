import { env } from '@/helpers/env'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsString } from 'class-validator'
import dayjs from 'dayjs'
import { type NextApiRequest } from 'next'
import { Post, Body, Req, createHandler, BadRequestException } from 'next-api-decorators'

class ParamSlugDto {
	@IsString()
	id?: string
}

class ApiGumroadPingServiceHandler {
	constructor() {}

	@Post()
	public async ping(@Req() req: NextApiRequest, @Body() data: any) {
		const {
			seller_id,
			product_id,
			product_name,
			permalink,
			product_permalink,
			short_product_id,
			email,
			price,
			gumroad_fee,
			currency,
			quantity,
			discover_fee_charged,
			can_contact,
			referrer,
			order_number,
			sale_id,
			sale_timestamp, // '2024-02-23T14:55:52Z'
			purchaser_id,
			subscription_id,
			test,
			ip_country,
			recurrence, // 'monthly', 'yearly', etc
			is_gift_receiver_purchase,
			refunded,
			disputed,
			dispute_won,
			url_params,
		} = data

		if (seller_id !== env('GUMROAD_SELLER_ID')) throw new BadRequestException('The seller is unknown')

		const userId = url_params?.uId
		const startDate = dayjs(sale_timestamp)
		const endDate = dayjs(sale_timestamp).add(1, 'month')

		let user = await prisma.user.findFirst({ where: { OR: [{ id: userId }, { email }] } })

		if (!user) {
			user = await prisma.user.create({ data: { email } })
		}

		if (refunded == 'false') {
			await prisma.subscription.create({
				data: {
					plan: { connect: { providerPlanName: permalink } },
					user: { connect: { id: user.id } },
					status: 'Active',
					startDate: startDate.toDate(),
					endDate: endDate.toDate(),
					providerId: subscription_id,
				},
			})
		} else {
			await prisma.subscription.update({
				where: { providerId: subscription_id },
				data: { status: prismaClient.SubscriptionStatus.Canceled, endDate: dayjs().toDate() },
			})
		}

		// console.log('data', data)
		return { success: true }
	}
}

export default createHandler(ApiGumroadPingServiceHandler)
