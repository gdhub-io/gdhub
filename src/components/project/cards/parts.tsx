import DefaultCover from "@/components/GameCard/DefaultCover";
import { AppImage } from "@/components/ui/AppImage";
import styles from "./parts.module.scss";

export type ProjectCardMember = {
	name: string | null;
	image: string | null;
};

export type ProjectCardTeam = {
	count: number;
	members: ProjectCardMember[];
};

/** Two letters instead of a generated face — a tinted circle beats a stranger. */
export function initials(name: string | null | undefined): string {
	const trimmed = name?.trim();
	if (!trimmed) return "?";
	return trimmed
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

/** The project's artwork, or the generated placeholder when there is none. */
export function Cover({
	coverImage,
	title,
	sizes,
}: {
	coverImage?: string | null;
	title: string;
	sizes: string;
}) {
	if (!coverImage) return <DefaultCover title={title} />;

	return (
		<AppImage
			src={coverImage}
			alt={title}
			fill
			sizes={sizes}
			className={styles.coverImage}
		/>
	);
}

export function StageChip({ label }: { label: string }) {
	return (
		<span className={styles.stageChip}>
			<span className={styles.stageDot} />
			{label}
		</span>
	);
}

export function HiringChip({ label }: { label: string }) {
	return <span className={styles.hiringChip}>{label}</span>;
}

/**
 * The team as a row of overlapping faces plus a count.
 *
 * The stack is capped by whatever the API sent; the count next to it carries
 * the real size, so a fourteen-person team does not become fourteen circles.
 */
export function TeamFacts({
	team,
	label,
}: {
	team: ProjectCardTeam;
	label: string;
}) {
	if (!team.count) return null;

	return (
		<span className={styles.teamFacts}>
			{team.members.length > 0 && (
				<span
					className={styles.avatars}
					style={{ width: 20 + (team.members.length - 1) * 14 }}
				>
					{team.members.map((member, index) => (
						<span
							key={`${member.name ?? "member"}-${index.toString()}`}
							className={styles.avatar}
							style={{ left: index * 14, zIndex: index }}
						>
							{member.image ? (
								<AppImage
									src={member.image}
									alt={member.name ?? ""}
									width={20}
									height={20}
									className={styles.avatarImage}
								/>
							) : (
								initials(member.name)
							)}
						</span>
					))}
				</span>
			)}
			<span className={styles.teamCount}>{label}</span>
		</span>
	);
}
