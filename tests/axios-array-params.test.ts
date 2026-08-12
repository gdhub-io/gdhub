import axios from "axios";
import { beforeAll, describe, expect, it } from "vitest";
import { configureAxios } from "@/config/axios";

beforeAll(() => {
	configureAxios();
});

/**
 * An array filter has to survive the trip.
 *
 * axios writes `?key[]=a&key[]=b` by default, and nothing on the server reads a
 * bracketed key — `withValidation(…, "query")` collapses repeated plain keys and
 * hand-rolled routes call `searchParams.getAll("key")`. The filter therefore
 * vanished without a word and the endpoint answered as though none had been
 * sent: the hub counted every event that had a schedule as "upcoming".
 */
describe("axios array query params", () => {
	it("sends repeated plain keys, not bracketed ones", () => {
		const uri = axios.getUri({
			url: "/api/events",
			params: { withDates: true, timeStatus: ["upcoming", "ongoing"] },
		});

		expect(uri).toContain("timeStatus=upcoming");
		expect(uri).toContain("timeStatus=ongoing");
		expect(uri).not.toContain("timeStatus[]");
		expect(uri).not.toContain("timeStatus%5B%5D");
	});

	it("is read back as an array by the parser the routes use", () => {
		const uri = axios.getUri({
			url: "/api/user/specialities",
			params: { level: ["Experienced", "Expert"] },
		});
		const params = new URL(uri, "http://localhost").searchParams;

		// `getAll` is exactly what /api/user/specialities calls.
		expect(params.getAll("level")).toEqual(["Experienced", "Expert"]);
	});

	it("leaves a single value alone", () => {
		const uri = axios.getUri({
			url: "/api/events",
			params: { lang: "en" },
		});

		expect(uri).toContain("lang=en");
	});
});
