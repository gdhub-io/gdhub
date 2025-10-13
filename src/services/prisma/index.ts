import {
	type GdhubDatabaseClient,
	GdhubDatabaseService,
} from "@gdhub-io/gdhub-prisma";

declare global {
	// eslint-disable-next-line no-var
	var cachedPrisma: GdhubDatabaseClient;
}

let prisma: GdhubDatabaseClient;

if (process.env.NODE_ENV === "production") {
	prisma = GdhubDatabaseService.init().client;
} else {
	if (!global.cachedPrisma) {
		global.cachedPrisma = GdhubDatabaseService.init().client;
	}

	prisma = global.cachedPrisma;
}

export { prisma };
