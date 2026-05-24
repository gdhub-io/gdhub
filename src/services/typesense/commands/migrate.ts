import type { SearchEngineService } from "@gdhub-io/gdhub-typesense";
import { specialistsSchema } from "@gdhub-io/gdhub-typesense/dist/schemes/specialists";
import dayjs from "dayjs";
import { prisma } from "@/services/prisma";

export async function migrate(searchClient: SearchEngineService) {
	try {
		const existSpecialists = await searchClient.existScheme(
			process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string,
		);

		if (!existSpecialists) {
			await searchClient.migrateScheme({
				...specialistsSchema,
				name: process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string,
			});
			console.info("Specialists sheme added");
		}
		console.info("Start");

		const specialists = await prisma.speciality.findMany({
			where: { user: { personalDataDeletedAt: null } },
			orderBy: { id: "asc" },
			include: { direction: true, user: { include: { profile: true } } },
		});

		try {
			const documents = specialists.map(
				(s: {
					id: string;
					user: {
						profile: {
							isActive: boolean;
							timeForWork: number[];
							country?: string | null;
							city?: string | null;
						} | null;
					};
					direction: { name: string };
				}) => {
					const { user, ...otherData } = s;

					return prepareData({
						...otherData,
						externalId: s.id,
						isActive: s.user.profile?.isActive,
						timeForWorkMin: user.profile?.timeForWork[0],
						timeForWorkMax: user.profile?.timeForWork[1],
						direction: s.direction.name,
						country: user.profile?.country,
						city: user.profile?.city,
					});
				},
			) as any[];
			await searchClient.client
				.collections(
					process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string,
				)
				.documents()
				.import(documents);

			console.info("Added");
		} catch (error: any) {
			console.info(error);
		}

		console.info("Finish");
	} catch (error: any) {
		console.info("Finish with Error");
	}
}

export const prepareData = (record: Record<string, any>) => {
	for (const property in record) {
		let value: string | string[] | number | undefined = record[property];

		if (Array.isArray(value) && value[0] == null) {
			value = undefined;
		}

		if (Array.isArray(value) && value.length == 1) {
			value = value[0];
		}

		if (
			typeof value == "string" &&
			(property == "skills" || property == "jobs" || property == "schools")
		) {
			value = value.split("\n");

			if (value[value.length - 1] == "") {
				value.pop();
			}
		}

		if (typeof value == "string" && property == "tools") {
			value = value.split(",");

			if (value[value.length - 1] == "") {
				value.pop();
			}
		}

		if (property == "direction" && !value) {
			value = "Other";
		}

		if (
			value instanceof Date &&
			(property == "createdAt" || property == "updatedAt")
		) {
			value = dayjs(value).unix();
		}

		record[property] = value;
	}

	return record;
};
