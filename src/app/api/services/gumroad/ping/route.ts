import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import dayjs from "dayjs";
import type { NextRequest } from "next/server";
import { env } from "@/helpers/env";
import { apiError, json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function POST(req: NextRequest) {
	const data = (await req.json().catch(() => null)) as Record<
		string,
		any
	> | null;
	if (!data) return apiError.badRequest("Invalid JSON body");

	const {
		seller_id,
		permalink,
		email,
		sale_timestamp,
		subscription_id,
		refunded,
		url_params,
	} = data;

	if (seller_id !== env("GUMROAD_SELLER_ID")) {
		return apiError.badRequest("The seller is unknown");
	}

	const userId = url_params?.uId;
	const startDate = dayjs(sale_timestamp);
	const endDate = dayjs(sale_timestamp).add(1, "month");

	let user = await prisma.user.findFirst({
		where: { OR: [{ id: userId }, { email }] },
	});

	if (!user) {
		user = await prisma.user.create({ data: { email } });
	}

	if (refunded == "false") {
		await prisma.subscription.create({
			data: {
				plan: { connect: { providerPlanName: permalink } },
				user: { connect: { id: user.id } },
				status: "Active",
				startDate: startDate.toDate(),
				endDate: endDate.toDate(),
				providerId: subscription_id,
			},
		});
	} else {
		await prisma.subscription.update({
			where: { providerId: subscription_id },
			data: {
				status: prismaClient.SubscriptionStatus.Canceled,
				endDate: dayjs().toDate(),
			},
		});
	}

	return json({ success: true });
}
