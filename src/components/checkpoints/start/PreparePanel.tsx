"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { CheckpointDto } from "@/types/checkpoints";
import { PaidPanel } from "../PaidPanel";
import { CuratorStep } from "./CuratorStep";
import { NowStep } from "./NowStep";
import { PaymentStep } from "./PaymentStep";
import { PrepareNavProvider } from "./PrepareNav";
import {
	PURCHASE_STEPS,
	PurchaseLayout,
	type PurchaseStep,
} from "./PurchaseLayout";

export type PreparePanelProps = {
	/** Where Cancel and "no draft" land: the project's checkpoint list. */
	base: string;
	/**
	 * Set once the checkpoint has been paid for. The questions are answered,
	 * so whichever one is asked for, the stage opens on Ready.
	 */
	paid?: CheckpointDto;
};

/**
 * Buying the checkpoint, as the first step of its own page.
 *
 * Which question is open is a query parameter, so Back works and a refresh
 * lands on the same question.
 */
export function PreparePanel({ base, paid }: PreparePanelProps) {
	const router = useRouter();
	const pathname = usePathname();
	const search = useSearchParams();

	const asked = search?.get("q") as PurchaseStep | null;
	const step: PurchaseStep =
		asked && PURCHASE_STEPS.includes(asked) ? asked : PURCHASE_STEPS[0];

	const nav = useMemo(
		() => ({
			go: (next: PurchaseStep) => {
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
			<PurchaseLayout saved={null}>
				<PaidPanel checkpoint={paid} />
			</PurchaseLayout>
		);
	}

	return (
		<PrepareNavProvider value={nav}>
			{step === "goal" && <NowStep />}
			{step === "curator" && <CuratorStep />}
			{step === "payment" && <PaymentStep />}
		</PrepareNavProvider>
	);
}
