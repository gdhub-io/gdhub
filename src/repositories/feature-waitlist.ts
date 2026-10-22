import { createHash } from "node:crypto";
import { AuditAction, type WaitlistFeature } from "@/config/prisma-enums";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const byEmail = (feature: WaitlistFeature, email: string) => ({
	feature_email: { feature, email: email.toLowerCase() },
});

export const isOnWaitlist = async (feature: WaitlistFeature, email: string) =>
	(await prisma.featureWaitlist.findUnique({
		where: byEmail(feature, email),
		select: { id: true },
	})) !== null;

/** Joining twice changes nothing: the first date stands. */
export const joinWaitlist = (feature: WaitlistFeature, email: string) =>
	prisma.featureWaitlist.upsert({
		where: byEmail(feature, email),
		create: { feature, email: email.toLowerCase() },
		update: {},
		select: { id: true },
	});

/** Frame 13.8: everyone waiting for a feature, newest first. */
export const listWaitlist = async (
	feature: WaitlistFeature,
	query?: string,
) => {
	const where = {
		feature,
		...(query
			? { email: { contains: query, mode: "insensitive" as const } }
			: {}),
	};
	const [rows, total] = await Promise.all([
		prisma.featureWaitlist.findMany({
			where,
			orderBy: { createdAt: "desc" },
			select: { id: true, email: true, createdAt: true },
		}),
		prisma.featureWaitlist.count({ where: { feature } }),
	]);
	return {
		total,
		rows: rows.map((row) => ({
			...row,
			createdAt: row.createdAt.toISOString(),
		})),
	};
};

export type WaitlistMessage = {
	/** Only these rows; everyone on the list when absent. */
	ids?: string[];
	title: string;
	message: string;
	/** Where the letter's button goes. */
	redirectUrl: string;
};

/**
 * Frame 13.8a: one letter to the bell and by email for everyone chosen. The same
 * text to the same row goes once, however often Send is pressed.
 */
export const writeToWaitlist = async (
	adminId: string,
	feature: WaitlistFeature,
	{ ids, title, message, redirectUrl }: WaitlistMessage,
) => {
	const rows = await prisma.featureWaitlist.findMany({
		where: { feature, ...(ids ? { id: { in: ids } } : {}) },
		select: { id: true, email: true },
	});
	const users = await prisma.user.findMany({
		where: { email: { in: rows.map((row) => row.email), mode: "insensitive" } },
		select: { id: true, email: true },
	});
	const userOf = new Map(
		users.map((user) => [user.email?.toLowerCase(), user.id]),
	);
	const letter = createHash("sha256")
		.update(`${feature}\n${title}\n${message}`)
		.digest("hex")
		.slice(0, 16);

	const results = await Promise.allSettled(
		rows.map((row) =>
			NovuService.send({
				template: "default-message",
				to: {
					// Every row came from a signed-in account; the email stands in if it is gone.
					subscriberId: userOf.get(row.email) ?? `waitlist-${row.email}`,
					email: row.email,
				},
				payload: { title, message, redirectUrl },
				transactionId: `waitlist-${letter}-${row.id}`,
			}),
		),
	);
	const failed = results.filter(
		(result) => result.status === "rejected",
	).length;

	await prisma.auditLog.create({
		data: {
			actorUserId: adminId,
			entity: "feature-waitlist",
			entityId: feature,
			action: AuditAction.CREATE,
			meta: { title, sent: rows.length - failed, failed },
		},
	});

	return { sent: rows.length - failed, failed };
};
