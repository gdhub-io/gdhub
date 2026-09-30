import { describe, expect, it } from "vitest";
import {
	contextSlot,
	type RoomContext,
} from "@/components/Chat/ChatContextLine/kinds";
import {
	adviceContext,
	closedAdviceContext,
	vacancyContext,
} from "@/components/Chat/fixtures/context";

const t = (_key: string, fallback: string, params?: Record<string, string>) =>
	fallback.replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? "");
const options = { t, invited: false, onClose: () => undefined };
const actionKeys = (context: RoomContext, invited = false) =>
	contextSlot(context, { ...options, invited })?.actions.map(
		(action) => (action as { key: string }).key,
	);

describe("contextSlot", () => {
	it("gives direct chats no context line", () => {
		expect(contextSlot({ type: "default", data: null }, options)).toBeNull();
		expect(contextSlot(undefined, options)).toBeNull();
	});

	it("summarises an advice request on one line", () => {
		expect(contextSlot(adviceContext, options)?.summary).toBe(
			"Topic: How do we price a premium DLC for a 12k-wishlist game? · Hollow Tide",
		);
	});

	it("offers resolve only while open, to someone allowed to close", () => {
		expect(actionKeys(adviceContext)).toEqual(["resolve"]);
		expect(actionKeys({ ...adviceContext, canClose: false })).toEqual([]);
		expect(actionKeys(closedAdviceContext)).toEqual([]);
		expect(contextSlot(closedAdviceContext, options)?.status).toBe("closed");
	});

	it("keeps the position link but drops close while an invite is pending", () => {
		expect(actionKeys(vacancyContext)).toEqual(["open", "close"]);
		expect(actionKeys(vacancyContext, true)).toEqual(["open"]);
	});
});
