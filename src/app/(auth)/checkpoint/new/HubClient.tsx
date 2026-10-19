"use client";

import { useTranslate } from "@tolgee/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { EntryHub } from "@/components/checkpoints/entry/EntryHub";
import { EntryShell } from "@/components/checkpoints/entry/EntryShell";
import { entryAboutHref } from "@/components/checkpoints/entry/hrefs";
import { useEntrySpeciality, useEntryStatus } from "@/hooks/checkpoint-entry";

export function HubClient({ projectSlug }: { projectSlug?: string }) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const status = useEntryStatus();
	const speciality = useEntrySpeciality();
	const router = useRouter();
	// A newcomer goes straight through the steps; the hub is the screen to come back to.
	const newcomer = !!status.data && !status.data.aboutDone;
	useEffect(() => {
		if (newcomer) router.replace(entryAboutHref(projectSlug));
	}, [newcomer, projectSlug, router]);

	const name = session?.user.name;
	const specialityName = speciality.data?.name;
	const aboutSummary =
		name && specialityName
			? t("checkpointEntry.about.done", "{name} · {speciality}", {
					name,
					speciality: specialityName,
				})
			: (name ?? undefined);

	return (
		<EntryShell next={status.data?.hadCheckpoint}>
			<EntryHub
				status={status.data}
				aboutSummary={aboutSummary}
				loading={status.isPending || newcomer}
				error={status.isError}
				onRetry={() => status.refetch()}
				projectSlug={projectSlug}
			/>
		</EntryShell>
	);
}
