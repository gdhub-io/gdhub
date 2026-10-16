"use client";

import { useTranslate } from "@tolgee/react";
import { useSession } from "next-auth/react";
import { EntryHub } from "@/components/checkpoints/entry/EntryHub";
import { EntryShell } from "@/components/checkpoints/entry/EntryShell";
import { useEntrySpeciality, useEntryStatus } from "@/hooks/checkpoint-entry";

export function HubClient({ projectSlug }: { projectSlug?: string }) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const status = useEntryStatus();
	const speciality = useEntrySpeciality();

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
				loading={status.isPending}
				error={status.isError}
				onRetry={() => status.refetch()}
				projectSlug={projectSlug}
			/>
		</EntryShell>
	);
}
