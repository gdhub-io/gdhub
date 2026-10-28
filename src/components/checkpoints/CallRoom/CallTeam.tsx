"use client";

import { useTranslate } from "@tolgee/react";
import { useCallPresence } from "@/hooks/checkpoint-call";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import { CallPersonRow, CallTeamPanel } from "./CallParts";

/** Frame 12.08.3: the call's people, who is in the room and who is away. */
export function CallTeam({
	call,
	inRoom,
}: {
	call: Pick<CheckpointCallDto, "checkpointId" | "index" | "state">;
	/** Who is in the room, by user id, when the viewer is in it too. */
	inRoom?: string[];
}) {
	const { t } = useTranslate();
	const { data } = useCallPresence(
		call.checkpointId,
		call.index,
		call.state === "open" && !inRoom,
	);
	if (!data) return null;

	const roleOf = (role: string | null) => {
		if (role === "curator") return t("checkpoints.call.curator", "Curator");
		if (role === "author") return t("checkpoints.call.author", "Author");
		return role ?? undefined;
	};

	const people = data.people.map((person) => ({
		...person,
		inCall: inRoom ? inRoom.includes(person.id) : person.inCall,
	}));

	return (
		<CallTeamPanel count={people.filter((person) => person.inCall).length}>
			{people.map((person) => (
				<CallPersonRow
					key={person.id}
					name={person.name}
					image={person.image}
					role={roleOf(person.role)}
					inCall={person.inCall}
				/>
			))}
		</CallTeamPanel>
	);
}
