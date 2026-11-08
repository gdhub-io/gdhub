import { zodSchema } from "ai";
import { describe, expect, it, vi } from "vitest";
import { sheetSchema } from "@/services/checkpoints/ai-curator/character";
import { letterSchema as planLetterSchema } from "@/services/checkpoints/ai-curator/plan-letter";
import { lineSchema } from "@/services/checkpoints/ai-curator/share-line";
import {
	adviceSchema,
	assessmentSchema,
	letterSchema as reviewLetterSchema,
} from "@/services/checkpoints/ai-review";
import { callNotesSchema } from "@/services/checkpoints/call-notes";
import { judgeSchema } from "@/services/evidence/judge";

vi.mock("@/services/ai/model", () => ({ aiModel: vi.fn(() => ({})) }));
vi.mock("@/services/ai-trace", () => ({ traceGenerated: vi.fn() }));
vi.mock("@/services/ai-usage", () => ({ recordAiUsage: vi.fn() }));

/**
 * The JSON Schema each structured AI call sends to the model. A change here
 * changes what the model is asked to answer, which no other test would notice:
 * update the snapshot only after reading the diff.
 */
describe("AI output schemas", () => {
	it.each<[string, Parameters<typeof zodSchema>[0]]>([
		["curator character sheet", sheetSchema],
		["curator plan letter", planLetterSchema],
		["share line", lineSchema],
		["plan advice", adviceSchema],
		["review assessment", assessmentSchema],
		["review letter", reviewLetterSchema],
		["call notes", callNotesSchema],
		["evidence judge", judgeSchema],
	])("%s", async (_name, schema) => {
		expect(await zodSchema(schema).jsonSchema).toMatchSnapshot();
	});
});
