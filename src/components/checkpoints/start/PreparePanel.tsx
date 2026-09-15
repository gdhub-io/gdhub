"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CuratorStep } from "./CuratorStep";
import { PaymentStep } from "./PaymentStep";
import { PlanningStep } from "./PlanningStep";
import { PrepareNavProvider } from "./PrepareNav";
import { START_STEPS, type StartStep } from "./StartLayout";
import { StartStepPage } from "./StartStepPage";

export type PreparePanelProps = {
	/** Where Cancel and "no draft" land: the project's checkpoint list. */
	base: string;
};

/**
 * Buying the checkpoint, as the first step of its own page.
 *
 * The five questions used to be five routes under `/checkpoints/new`; they are
 * one step now, and which question is open is a query parameter, so Back works
 * and a refresh lands on the same question.
 */
export function PreparePanel({ base }: PreparePanelProps) {
	const router = useRouter();
	const pathname = usePathname();
	const search = useSearchParams();

	const asked = search?.get("q") as StartStep | null;
	const step: StartStep =
		asked && START_STEPS.includes(asked) ? asked : START_STEPS[0];

	const nav = useMemo(
		() => ({
			go: (next: StartStep) => {
				const params = new URLSearchParams(search?.toString());
				params.set("step", "inputs");
				params.set("q", next);
				router.replace(`${pathname}?${params.toString()}`, { scroll: false });
			},
			exit: () => router.push(base),
		}),
		[base, pathname, router, search],
	);

	return (
		<PrepareNavProvider value={nav}>
			{(step === "now" || step === "goal") && <StartStepPage step={step} />}
			{step === "curator" && <CuratorStep />}
			{step === "planning" && <PlanningStep />}
			{step === "payment" && <PaymentStep />}
		</PrepareNavProvider>
	);
}
