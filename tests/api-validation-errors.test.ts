import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/prisma", () => ({ prisma: {} }));

import { json, withValidation } from "@/lib/api-handlers";

const handler = withValidation(
	z.object({ id: z.string(), links: z.array(z.string().url()) }),
)((_req, _ctx, { body }) => json(body));

const call = (body: unknown) =>
	handler(
		new NextRequest("http://localhost/api/user/project/link", {
			method: "PUT",
			body: JSON.stringify(body),
		}),
		{ params: Promise.resolve({}) },
		{},
	);

/** The 400 a client gets for invalid input is part of the API: its shape must not drift with zod. */
describe("withValidation errors", () => {
	it("answers 400 with a field tree of `_errors`", async () => {
		const response = await call({ id: 1, links: ["not a url"] });
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toMatchObject({ error: "Validation failed", statusCode: 400 });
		expect(body.details._errors).toEqual([]);
		expect(body.details.id._errors).toHaveLength(1);
		expect(body.details.links[0]._errors).toHaveLength(1);
	});

	it("passes valid input through as `body`", async () => {
		const input = { id: "p1", links: ["https://gdhub.io"] };
		const response = await call(input);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(input);
	});
});
