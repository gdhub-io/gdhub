import { describe, expect, it } from "vitest";
import { sameBlocks } from "@/helpers/editorjs";
import { ownStageFields } from "@/lib/workflow/own-stage";
import { toDrafts, toPayload } from "@/lib/workflow/template-drafts";
import {
	WorkflowStepsInputSchema,
	WorkflowStepsTemplateSchema,
} from "@/schemas/workflow";

/**
 * Nothing an admin did not touch may be lost on save (GDHUB-97). A template's
 * steps are one JSON column replaced whole, and a field the schema or the
 * editor drops is a field every save wipes without a word.
 */

const content = {
	time: 1,
	version: "2.31.0",
	blocks: [
		{ id: "a1", type: "header", data: { text: "Prototype", level: 2 } },
		{ id: "a2", type: "paragraph", data: { text: "Make the <b>core</b> playable." } },
	],
};

const template: PrismaJson.WorkflowStep[] = [
	{
		name: "Prototyping",
		title: "Prototype it",
		description: "notion::gamelab-pipeline.prototyping",
		goal: "The core works and the style is chosen.",
		content,
		tasks: [
			{
				name: "Publish a devlog",
				description: "About the prototype.",
				required: true,
				condition: { source: "links", min: 1 },
			},
		],
	},
	{ name: "Support", tasks: [] },
];

describe("a template saved untouched comes back as it was", () => {
	it("keeps every field of every step and task through the editor", () => {
		expect(toPayload(toDrafts(template))).toEqual(template);
	});

	it("keeps goal and text through validation — a stripped key is a wiped key", () => {
		const parsed = WorkflowStepsTemplateSchema.parse(template);
		expect(parsed[0].goal).toBe(template[0].goal);
		expect(parsed[0].content).toEqual(content);
	});

	it("refuses an empty template rather than writing one", () => {
		expect(WorkflowStepsTemplateSchema.safeParse([]).success).toBe(false);
	});
});

describe("a project step's own goal and text", () => {
	const clear = Symbol("DbNull");

	it("is kept through validation", () => {
		const [step] = WorkflowStepsInputSchema.parse([
			{ id: "s1", name: "Prototyping", goal: "Ours.", content },
		]);
		expect(step.goal).toBe("Ours.");
		expect(step.content).toEqual(content);
	});

	it("is left as stored when the payload does not carry it", () => {
		expect(ownStageFields({ name: "Prototyping" }, clear)).toEqual({
			goal: undefined,
			content: undefined,
		});
	});

	it("is cleared back to the template's only when sent empty", () => {
		expect(ownStageFields({ goal: null, content: null }, clear)).toEqual({
			goal: null,
			content: clear,
		});
		expect(ownStageFields({ goal: "", content: { blocks: [] } }, clear)).toEqual({
			goal: null,
			content: clear,
		});
	});

	it("is written when it holds something", () => {
		expect(ownStageFields({ goal: "Ours.", content }, clear)).toEqual({
			goal: "Ours.",
			content,
		});
	});
});

describe("sameBlocks", () => {
	it("reads a just-loaded text as unchanged: new ids, keys in another order", () => {
		const loaded = content.blocks.map(({ type, data }) => ({
			id: `new-${type}`,
			data: Object.fromEntries(Object.entries(data).reverse()),
			type,
		}));
		expect(sameBlocks(loaded, content.blocks)).toBe(true);
	});

	it("tells an edit apart", () => {
		const edited = [
			content.blocks[0],
			{ ...content.blocks[1], data: { text: "Make the core fun." } },
		];
		expect(sameBlocks(edited, content.blocks)).toBe(false);
	});
});
