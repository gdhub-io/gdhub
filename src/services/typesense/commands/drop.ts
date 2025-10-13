import type { SearchEngineService } from "@gdhub-io/gdhub-typesense";

export async function drop(searchClient: SearchEngineService) {
	const existSpecialists = await searchClient.existScheme(
		process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string,
	);

	if (existSpecialists) {
		await searchClient.deleteScheme(
			process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string,
		);
		console.info("Specialists sheme was dropped");
	} else {
		console.info("Nothing changes");
	}
}
