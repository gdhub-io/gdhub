"use client";

import { IconFlag, IconX } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Skeleton } from "antd";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PaidPanel } from "@/components/checkpoints/PaidPanel";
import { CuratorStep } from "@/components/checkpoints/start/CuratorStep";
import { NowStep } from "@/components/checkpoints/start/NowStep";
import { PaymentStep } from "@/components/checkpoints/start/PaymentStep";
import { PrepareNavProvider } from "@/components/checkpoints/start/PrepareNav";
import {
	START_STEPS,
	StartLayout,
	type StartStep,
} from "@/components/checkpoints/start/StartLayout";
import { useSetSpaceHeader } from "@/components/layouts/SpaceHeader";
import { EmptyState } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useCheckpoint, useCheckpoints } from "@/hooks/checkpoints";
import { useCurrentProject } from "@/hooks/project";
import styles from "./style.module.scss";

/**
 * Buying a checkpoint, on its own page: `/workflow/cp/new?step=now|curator|
 * payment|ready` (frames 03–06). The header drops the project tabs so the only
 * way out is "Save and close" — the draft keeps everything written so far.
 */
export function CheckpointPurchase() {
	const { t } = useTranslate();
	const router = useRouter();
	const pathname = usePathname();
	const search = useSearchParams();
	const { project } = useCurrentProject();
	const { data: list, isPending } = useCheckpoints(project?.id);
	const current = list?.current ?? null;
	const { data: detail } = useCheckpoint(current?.id);

	const workflow = `/user/project/${project?.slug}/workflow`;
	const asked = search?.get("step");
	const step: StartStep =
		asked && START_STEPS.includes(asked as StartStep)
			? (asked as StartStep)
			: "now";

	// Paid, or on the way back from Stripe before the webhook lands: Ready.
	const paid =
		!!current &&
		(current.status === CheckpointStatus.AwaitingCurator ||
			(current.status === CheckpointStatus.Draft &&
				(!!current.paymentId || !!current.curatorDeclinedAt)) ||
			(current.status === CheckpointStatus.Draft && asked === "ready"));
	// The curator took it on, or the AI one started it: the path shows it now.
	const running =
		current?.status === CheckpointStatus.Active ||
		current?.status === CheckpointStatus.Review;

	useEffect(() => {
		if (running && project?.slug) router.replace(workflow);
	}, [running, project?.slug, router, workflow]);

	const header = useMemo(
		() => ({
			trail: {
				parent: { href: workflow, label: project?.name ?? "" },
				current: { label: t("checkpoints.purchase.title", "New checkpoint") },
			},
			exit: (
				<Link href={workflow}>
					<Button type="text" icon={<IconX size={20} />} iconPlacement="end">
						{paid
							? t("checkpoints.purchase.close", "Close")
							: t("checkpoints.purchase.saveAndClose", "Save and close")}
					</Button>
				</Link>
			),
		}),
		[workflow, project?.name, paid, t],
	);
	useSetSpaceHeader(header);

	const nav = useMemo(
		() => ({
			go: (next: StartStep) =>
				router.replace(`${pathname}?step=${next}`, { scroll: false }),
			exit: () => router.push(workflow),
		}),
		[pathname, router, workflow],
	);

	if (isPending || !project) {
		return (
			<div className={styles.page}>
				<Skeleton active paragraph={{ rows: 8 }} />
			</div>
		);
	}

	if (paid) {
		return (
			<div className={styles.page}>
				<StartLayout step="ready" saved={null}>
					{detail && <PaidPanel checkpoint={detail} exitHref={workflow} />}
				</StartLayout>
			</div>
		);
	}

	if (current?.status !== CheckpointStatus.Draft) {
		return (
			<div className={styles.page}>
				<EmptyState
					icon={IconFlag}
					title={t(
						"checkpoints.prepare.noDraft",
						"There is no draft to continue",
					)}
					action={
						<Link href={workflow}>
							<Button type="primary">
								{t("checkpoints.prepare.toWorkflow", "Back to the workflow")}
							</Button>
						</Link>
					}
				/>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<PrepareNavProvider value={nav}>
				{step === "now" && <NowStep />}
				{step === "curator" && <CuratorStep />}
				{step === "payment" && <PaymentStep />}
			</PrepareNavProvider>
		</div>
	);
}
