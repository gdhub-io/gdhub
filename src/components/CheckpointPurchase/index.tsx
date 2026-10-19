"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Skeleton } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { EntryShell } from "@/components/checkpoints/entry/EntryShell";
import {
	CHECKPOINT_ENTRY_HREF,
	checkoutHref,
} from "@/components/checkpoints/entry/hrefs";
import { PaidPanel } from "@/components/checkpoints/PaidPanel";
import { CuratorStep } from "@/components/checkpoints/start/CuratorStep";
import { NowStep } from "@/components/checkpoints/start/NowStep";
import { PaymentStep } from "@/components/checkpoints/start/PaymentStep";
import { PrepareNavProvider } from "@/components/checkpoints/start/PrepareNav";
import {
	PURCHASE_STEPS,
	type PurchaseStep,
} from "@/components/checkpoints/start/PurchaseLayout";
import { PurchaseSteps } from "@/components/checkpoints/start/PurchaseSteps";
import {
	type PurchaseProject,
	PurchaseProjectProvider,
} from "@/components/checkpoints/start/useDraft";
import { useCheckpoint, useCheckpoints } from "@/hooks/checkpoints";
import { purchaseState } from "./purchaseState";
import styles from "./style.module.scss";

export type CheckpointPurchaseProps = {
	/** Resolved on the server, where the Founder check is made. */
	project: PurchaseProject;
};

/**
 * Buying a checkpoint for one project: `/checkpoint/new/checkout?project=…&
 * step=goal|curator|payment|ready` (frames 12.3–12.7), in the hub's light
 * shell. The draft is made in the hub; arriving without one goes back there,
 * and so does the one way out — the draft keeps everything written so far.
 */
export function CheckpointPurchase({ project }: CheckpointPurchaseProps) {
	const { t } = useTranslate();
	const router = useRouter();
	const search = useSearchParams();
	const { data: list, isPending } = useCheckpoints(project.id);
	const current = list?.current ?? null;
	const { data: detail } = useCheckpoint(current?.id);

	const workflow = `/user/project/${project.slug}/workflow`;
	const asked = search?.get("step");
	const { step, isDraft, paid, running } = purchaseState(current, asked);
	// Nothing to buy here: the hub is where a draft is made.
	const noDraft = !isPending && !paid && !running && !isDraft;

	useEffect(() => {
		if (running) router.replace(workflow);
	}, [running, router, workflow]);

	useEffect(() => {
		if (noDraft) router.replace(CHECKPOINT_ENTRY_HREF);
	}, [noDraft, router]);

	// Keep the address honest when it asked for a step the draft has not earned.
	useEffect(() => {
		if (isDraft && !paid && asked && asked !== step)
			router.replace(checkoutHref(project.slug, step), { scroll: false });
	}, [isDraft, paid, asked, step, project.slug, router]);

	const nav = useMemo(
		() => ({
			go: (next: PurchaseStep) =>
				router.replace(checkoutHref(project.slug, next), { scroll: false }),
			exit: () => router.push(CHECKPOINT_ENTRY_HREF),
		}),
		[project.slug, router],
	);

	const loading = isPending || running || noDraft;

	const body = () => {
		if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
		if (!paid)
			return (
				<PrepareNavProvider value={nav}>
					{step === "goal" && <NowStep />}
					{step === "curator" && <CuratorStep />}
					{step === "payment" && <PaymentStep />}
				</PrepareNavProvider>
			);
		if (!detail) return <Skeleton active paragraph={{ rows: 4 }} />;
		return (
			<PaidPanel
				checkpoint={detail}
				exitHref={workflow}
				projectHref={`/user/project/${project.slug}/settings`}
			/>
		);
	};

	return (
		<PurchaseProjectProvider value={project}>
			<EntryShell
				next={(list?.closed.total ?? 0) > 0}
				back={
					// Where the space header's "Save and close" used to be: quiet, and back to the plan.
					<Link href={CHECKPOINT_ENTRY_HREF} className={styles.back}>
						<Button type="text" icon={<IconArrowLeft size={16} />}>
							{t("checkout.backToPlan", "Back to your checkpoint plan")}
						</Button>
					</Link>
				}
				stepper={
					!loading && (
						<PurchaseSteps
							current={
								paid ? PURCHASE_STEPS.length : PURCHASE_STEPS.indexOf(step)
							}
						/>
					)
				}
			>
				{body()}
			</EntryShell>
		</PurchaseProjectProvider>
	);
}
