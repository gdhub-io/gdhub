import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PayableType } from "@gdhub-io/gdhub-prisma";
import { CHECKPOINT_MINOR_UNITS } from "../../../../src/config/checkpoint";
import { MICROS_PER_USD } from "../../../../src/lib/checkpoints/costs";
import {
	CAPTURED,
	refundedTotal,
} from "../../../../src/repositories/checkpoints/refund";
import { prisma } from "../../../../src/services/prisma";

/**
 * The report a flow leaves behind (GDHUB-79): what was done, what the AI was
 * shown and wrote — read back from the curator journal, so it is what the
 * admin's drawer shows — and what the flow cost.
 */

const DIR = "test-results/checkpoints";

const usd = (micros: number) => `$${(micros / MICROS_PER_USD).toFixed(4)}`;
const money = (minor: number, currency = "") =>
	`${(minor / CHECKPOINT_MINOR_UNITS).toFixed(2)} ${currency}`.trim();
const quote = (value: unknown) =>
	typeof value === "string" ? value : JSON.stringify(value, null, 2);
const block = (value: unknown) => `\n\`\`\`\n${quote(value)}\n\`\`\`\n`;

export class RunLog {
	private readonly lines: string[] = [];
	private readonly checkpoints = new Set<string>();

	constructor(private readonly flow: string) {}

	step(text: string) {
		this.lines.push(`- ${new Date().toISOString().slice(11, 19)} ${text}`);
	}

	track(checkpointId: string) {
		this.checkpoints.add(checkpointId);
	}

	async write() {
		const parts = [`# ${this.flow}`, "", "## Steps", "", ...this.lines];
		let paid = 0;
		let spent = 0;

		for (const id of this.checkpoints) {
			const section = await checkpointSection(id);
			parts.push("", section.text);
			paid += section.paid;
			spent += section.spent;
		}

		parts.push(
			"",
			"## Cost of the flow",
			"",
			`- Paid through Paddle: ${money(paid)}`,
			`- AI spend: ${usd(spent)}`,
		);

		mkdirSync(DIR, { recursive: true });
		const file = join(DIR, `${this.flow.replace(/[^\w-]+/g, "-")}.md`);
		writeFileSync(file, `${parts.join("\n")}\n`);

		return file;
	}
}

async function checkpointSection(id: string) {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: {
			goal: true,
			status: true,
			verdict: true,
			verdictNote: true,
			paymentId: true,
			items: {
				orderBy: [{ kind: "asc" }, { order: "asc" }],
				select: {
					kind: true,
					text: true,
					cut: true,
					evidence: {
						select: {
							match: true,
							matchNote: true,
							artifact: { select: { link: true, checkStatus: true } },
						},
					},
				},
			},
			sessions: {
				orderBy: { index: "asc" },
				select: { index: true, contentStatus: true, content: true },
			},
			journal: { orderBy: { createdAt: "asc" } },
			aiUsage: { orderBy: { createdAt: "asc" } },
			_count: { select: { pulses: true } },
		},
	});
	if (!checkpoint) return { text: `## Checkpoint ${id}\n\nRemoved.`, paid: 0, spent: 0 };

	const payments = await prisma.payment.findMany({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: id,
			status: { in: CAPTURED },
		},
		select: { amount: true, currency: true, status: true, refunds: true },
	});

	const out = [
		`## Checkpoint ${id}`,
		"",
		`**Goal:** ${checkpoint.goal}`,
		`**Status:** ${checkpoint.status} · **verdict:** ${checkpoint.verdict ?? "—"}`,
		checkpoint.verdictNote ? `\n> ${checkpoint.verdictNote}` : "",
		"",
		"### Tasks",
		"",
		...checkpoint.items.map(
			(item) =>
				`- ${item.kind}${item.cut ? " (cut)" : ""}: ${item.text}` +
				item.evidence
					.map(
						(piece) =>
							`\n  - ${piece.artifact.link} [${piece.artifact.checkStatus ?? "unchecked"}]` +
							(piece.match ? ` AI: ${piece.match} — ${piece.matchNote ?? ""}` : ""),
					)
					.join(""),
		),
		"",
		"### The curator's journal",
	];

	for (const entry of checkpoint.journal) {
		out.push(
			"",
			`#### ${entry.kind} · sprint ${entry.sprint ?? "—"}${entry.link ? ` · ${entry.link}` : ""}`,
		);
		if (entry.input) out.push("Shown:", block(entry.input));
		out.push("Wrote:", block(entry.output));
	}

	out.push("", "### Reviews", "");
	for (const session of checkpoint.sessions) {
		out.push(
			`#### Session ${session.index} · ${session.contentStatus ?? "not written"}`,
		);
		if (session.content) out.push(block(session.content));
	}

	out.push("", `### Pulses requested: ${checkpoint._count.pulses}`, "");

	const spent = checkpoint.aiUsage.reduce((sum, row) => sum + row.cost, 0);
	out.push("### AI spend", "", "| Purpose | Model | In | Out | Cost |", "|---|---|---|---|---|");
	for (const row of checkpoint.aiUsage) {
		out.push(
			`| ${row.purpose} | ${row.model} | ${row.inputTokens} | ${row.outputTokens} | ${usd(row.cost)} |`,
		);
	}
	out.push(`| **Total** | | | | **${usd(spent)}** |`);

	const paid = payments.reduce((sum, row) => sum + row.amount, 0);
	out.push(
		"",
		"### Payments",
		"",
		...payments.map(
			(row) =>
				`- ${money(row.amount, row.currency)} · ${row.status}` +
				(row.refunds.length > 0
					? ` · refunded ${money(refundedTotal(row.refunds), row.currency)}`
					: ""),
		),
	);

	return { text: out.join("\n"), paid, spent };
}
