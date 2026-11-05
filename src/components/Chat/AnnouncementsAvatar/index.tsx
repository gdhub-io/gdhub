import { IconSpeakerphone } from "@tabler/icons-react";
import { Avatar } from "antd";
import { AppAvatar } from "@/components/ui/AppAvatar";
import styles from "./style.module.scss";

/** The Announcements room's own mark: a megaphone on the neutral disc. */
export function AnnouncementsAvatar({ size = 40 }: { size?: number }) {
	return (
		<Avatar
			size={size}
			className={styles.room}
			icon={<IconSpeakerphone size={size / 2} />}
		/>
	);
}

/** The account Announcements posts come from: the brand mark, no disc. */
export function GdhubAvatar({
	size = 32,
	className,
}: {
	size?: number;
	className?: string;
}) {
	return (
		<AppAvatar
			size={size}
			shape="square"
			src="/favicon.svg"
			className={[styles.gdhub, className].filter(Boolean).join(" ")}
		>
			GD
		</AppAvatar>
	);
}
