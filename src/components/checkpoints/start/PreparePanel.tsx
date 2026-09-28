"use client";

import { useTranslate } from "@tolgee/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { CheckpointDto } from "@/types/checkpoints";
import { PaidPanel } from "../PaidPanel";
import { CuratorStep } from "./CuratorStep";
import { PaymentStep } from "./PaymentStep";
import { PlanningStep } from "./PlanningStep";
import { PrepareNavProvider } from "./PrepareNav";
import { START_STEPS, StartLayout, type StartStep } from "./StartLayout";
import { StartStepPage } from "./StartStepPage";

export type PreparePanelProps = {
	/** Where Cancel and "no draft" land: the project's checkpoint list. */
	base: string;
	/**
	 * Set once the checkpoint has been paid for. The five questions are answered,
	 * so whichever one is asked for, the stage opens on Ready.
	 */
	paid?: CheckpointDto;
};

/**
 * Buying the checkpoint, as the first step of its own page.
 *
 * The five questions used to be five routes under `/checkpoints/new`; they are
 * one step now, and which question is open is a query parameter, so Back works
 * and a refresh lands on the same question.
 */
export function PreparePanel({ base, paid }: PreparePanelProps) {
	const { t } = useTranslate();
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

	if (paid) {
		return (
			<StartLayout step="ready" saved={null}>
				<PaidPanel checkpoint={paid} />
			</StartLayout>
		);
	}

	return (
		<PrepareNavProvider value={nav}>
			{(step === "now" || step === "goal") && <StartStepPage step={step} />}
			{step === "curator" && <CuratorStep />}
			{step === "planning" && <PlanningStep />}
			{step === "payment" && <PaymentStep />}
		</PrepareNavProvider>
	);
}
