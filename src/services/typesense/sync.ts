import { SearchEngineService } from "@gdhub-io/gdhub-typesense";
import { prisma } from "@/services/prisma";
import { prepareData } from "./commands/migrate";

let _client: SearchEngineService | null = null;

async function getClient() {
	if (_client) return _client;

	const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST;
	const port = process.env.NEXT_PUBLIC_TYPESENSE_PORT;
	const protocol = process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL;
	const apiKey = process.env.TYPESENSE_ADMIN_API;

	if (!host || !port || !protocol || !apiKey) return null;

	_client = await SearchEngineService.init({
		host,
		port: Number.parseInt(port),
		protocol,
		apiKey,
	});
	return _client;
}

function getCollectionName() {
	return process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string;
}

export async function syncSpecialistToSearch(specialityId: string) {
	try {
		const client = await getClient();
		if (!client) return;

		const speciality = await prisma.speciality.findUnique({
			where: { id: specialityId },
			include: { direction: true, user: { include: { profile: true } } },
		});

		if (!speciality || speciality.user.personalDataDeletedAt) return;

		const { user, ...otherData } = speciality;
		const doc = prepareData({
			...otherData,
			externalId: speciality.id,
			isActive: user.profile?.isActive,
			timeForWorkMin: user.profile?.timeForWork?.[0],
			timeForWorkMax: user.profile?.timeForWork?.[1],
			direction: speciality.direction?.name,
			country: user.profile?.country,
			city: user.profile?.city,
		});

		try {
			await client.updateSpecialist(getCollectionName(), specialityId, doc);
		} catch {
			await client.addSpecialist(getCollectionName(), doc);
		}
	} catch (error) {
		console.error(
			`[typesense] Failed to sync specialist ${specialityId}:`,
			error,
		);
	}
}

export async function removeSpecialistFromSearch(specialityId: string) {
	try {
		const client = await getClient();
		if (!client) return;

		await client.deleteSpecialist(specialityId);
	} catch (error) {
		console.error(
			`[typesense] Failed to remove specialist ${specialityId}:`,
			error,
		);
	}
}
