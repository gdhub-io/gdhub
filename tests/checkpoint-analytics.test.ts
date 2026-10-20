import { readFileSync } from "node:fs";
import path from "node:path";
import { CheckpointCuratorKind } from "@gdhub-io/gdhub-prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CHECKPOINT_EVENT_PARAMS,
	curatorSwitch,
	purchaseParams,
} from "@/config/analytics-events";
import { trackCheckpoint } from "@/helpers/gtm";

describe("curatorSwitch", () => {
	it("is first when nothing came before", () => {
		expect(curatorSwitch(null, "ai")).toBe("first");
		expect(curatorSwitch(null, "human")).toBe("first");
	});

	it("tells staying from switching, either way", () => {
		expect(curatorSwitch("ai", "ai")).toBe("same");
		expect(curatorSwitch("human", "human")).toBe("same");
		expect(curatorSwitch("ai", "human")).toBe("ai_to_human");
		expect(curatorSwitch("human", "ai")).toBe("human_to_ai");
	});
});

describe("purchaseParams", () => {
	const draft = {
		id: "cp2",
		projectId: "p1",
		curatorKind: CheckpointCuratorKind.Human,
		number: 2,
		previousCuratorKind: CheckpointCuratorKind.AI,
	};

	it("reports a second checkpoint switching from the AI to an expert", () => {
		expect(purchaseParams(draft, "Expert")).toEqual({
			checkpoint_id: "cp2",
			project_id: "p1",
			checkpoint_number: 2,
			curator_kind: "human",
			curator_level: "expert",
			previous_curator_kind: "ai",
			curator_switch: "ai_to_human",
		});
	});

	it("carries no level for the AI curator", () => {
		const params = purchaseParams(
			{
				...draft,
				curatorKind: CheckpointCuratorKind.AI,
				number: 1,
				previousCuratorKind: null,
			},
			"Experienced",
		);
		expect(params.curator_level).toBeNull();
		expect(params.curator_switch).toBe("first");
	});
});

describe("trackCheckpoint", () => {
	let store: Map<string, string>;
	let dataLayer: Record<string, unknown>[];

	const stubWindow = (withDataLayer: boolean) => {
		dataLayer = [];
		vi.stubGlobal("window", {
			...(withDataLayer && { dataLayer }),
			localStorage: {
				getItem: (key: string) => store.get(key) ?? null,
				setItem: (key: string, value: string) => store.set(key, value),
			},
			setTimeout,
		});
	};

	beforeEach(() => {
		store = new Map();
		stubWindow(true);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it("pushes the params flat beside the event name", () => {
		trackCheckpoint("checkpoint_landing_cta", { section: "hero" });
		expect(dataLayer).toEqual([
			{ event: "checkpoint_landing_cta", section: "hero" },
		]);
	});

	it("fires a moment once per key", () => {
		const fire = () =>
			trackCheckpoint(
				"checkpoint_goal_set",
				{ warned: false },
				{ once: "goal:a" },
			);
		fire();
		fire();
		expect(dataLayer).toHaveLength(1);
	});

	it("remembers a persisted key across a reload", () => {
		trackCheckpoint(
			"checkpoint_pulse_answered",
			{ sprint: 1 },
			{ once: "pulse:a", persist: true },
		);
		expect([...store.keys()]).toEqual(["gd.cp.once.pulse:a"]);

		// The in-memory set is per page; a fresh one with the same storage stays quiet.
		vi.resetModules();
		return import("@/helpers/gtm").then(({ trackCheckpoint: fresh }) => {
			stubWindow(true);
			fresh(
				"checkpoint_pulse_answered",
				{ sprint: 1 },
				{ once: "pulse:a", persist: true },
			);
			expect(dataLayer).toHaveLength(0);
		});
	});

	it("still runs the callback when GTM is absent", () => {
		stubWindow(false);
		const callback = vi.fn();
		trackCheckpoint("checkpoint_payment_cancelled", {}, { callback });
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("hands the callback to GTM, and runs it once even when GTM never answers", () => {
		vi.useFakeTimers();
		stubWindow(true);
		const callback = vi.fn();
		trackCheckpoint("checkpoint_payment_cancelled", {}, { callback });

		expect(dataLayer[0]).toMatchObject({ eventTimeout: 1000 });
		expect(callback).not.toHaveBeenCalled();
		(dataLayer[0].eventCallback as () => void)();
		vi.advanceTimersByTime(2000);
		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe("the events doc and the GTM import", () => {
	const root = path.resolve(import.meta.dirname, "..");
	const doc = readFileSync(
		path.join(root, "docs/analytics/checkpoint-events.md"),
		"utf8",
	);
	const container = JSON.parse(
		readFileSync(
			path.join(root, "docs/analytics/gtm-checkpoint-events.json"),
			"utf8",
		),
	).containerVersion as {
		tag: {
			name: string;
			firingTriggerId: string[];
			parameter: {
				key: string;
				value?: string;
				list?: { map: { key: string; value: string }[] }[];
			}[];
		}[];
		trigger: {
			triggerId: string;
			customEventFilter: { parameter: { value: string }[] }[];
		}[];
		variable: {
			name: string;
			type: string;
			parameter: { key: string; value: string }[];
		}[];
	};
	const events = Object.entries(CHECKPOINT_EVENT_PARAMS) as [
		string,
		readonly string[],
	][];

	it("lists every event in the doc, with its params", () => {
		for (const [event, params] of events) {
			expect(doc).toContain(`\`${event}\``);
			for (const param of params) expect(doc).toContain(`\`${param}\``);
		}
	});

	it("has a trigger and a GA4 tag per event, sending exactly its params", () => {
		const triggerFor = (event: string) =>
			container.trigger.find(
				(trigger) =>
					trigger.customEventFilter[0].parameter.find(
						(one) => one.value === event,
					) !== undefined,
			);

		for (const [event, params] of events) {
			const trigger = triggerFor(event);
			expect(trigger, event).toBeDefined();

			const tag = container.tag.find((one) =>
				one.parameter.some(
					(param) => param.key === "eventName" && param.value === event,
				),
			);
			expect(tag, event).toBeDefined();
			expect(tag?.firingTriggerId).toEqual([trigger?.triggerId]);

			const sent =
				tag?.parameter
					.find((param) => param.key === "eventSettingsTable")
					?.list?.map(
						(row) =>
							row.map.find((one) => one.key === "parameter")?.value ?? "",
					) ?? [];
			expect([...sent].sort(), event).toEqual([...params].sort());
		}
	});

	it("has a data layer variable behind every param a tag reads", () => {
		const names = new Set(container.variable.map((one) => one.name));
		const params = new Set(events.flatMap(([, list]) => list));
		for (const param of params) expect(names).toContain(`dlv - ${param}`);
		expect(names).toContain("GA4 Measurement ID");
	});

	it("keeps trigger ids unique", () => {
		const ids = container.trigger.map((one) => one.triggerId);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
