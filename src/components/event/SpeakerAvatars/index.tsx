"use client";

import { Avatar } from "antd";
import { AppAvatar } from "@/components/ui/AppAvatar";
import styles from "./style.module.scss";

export type SpeakerLike = {
	id?: string;
	name?: string | null;
	user?: { image?: string | null; profile?: { name?: string | null } | null };
};

const speakerName = (speaker: SpeakerLike) =>
	speaker.user?.profile?.name || speaker.name || "";

/**
 * A session's speakers, as one stack.
 *
 * Both the public programme and the organiser's timeline used to overlap the
 * avatars by hand with negative margins, which drifted apart and read as
 * separate discs rather than a group. `Avatar.Group` owns the overlap, the ring
 * and the "+N" overflow, so there is one stack and one place to change it.
 */
export function SpeakerAvatars({
	speakers,
	size = 24,
	max = 4,
}: {
	speakers: SpeakerLike[];
	size?: number;
	max?: number;
}) {
	if (!speakers.length) return null;

	return (
		<Avatar.Group
			className={styles.group}
			size={size}
			max={{ count: max, style: { fontSize: 11 } }}
		>
			{speakers.map((speaker, index) => {
				const name = speakerName(speaker);
				return (
					<AppAvatar
						key={speaker.id || index}
						src={speaker.user?.image || undefined}
						alt={name}
					>
						{name ? name[0] : null}
					</AppAvatar>
				);
			})}
		</Avatar.Group>
	);
}

export default SpeakerAvatars;
