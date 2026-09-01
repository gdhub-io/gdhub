"use client";

import { IconQuote } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import {
	getHubSectionShellClass,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { AppImage } from "@/components/ui/AppImage";
import styles from "./ProjectAuthorCard.module.scss";

const { Text } = Typography;

type AuthorSpeciality = {
	name?: string | null;
	specialization?: string | null;
	level?: string | null;
};

type ProjectAuthor = {
	name?: string | null;
	image?: string | null;
	profile?: { name?: string | null; motivation?: string | null } | null;
	specialities?: AuthorSpeciality[] | null;
};

/**
 * "Project author" sidebar card — avatar, name, speciality · level and the
 * author's motivation (from their profile). Shared sidebar component.
 */
export function ProjectAuthorCard({
	author,
	bare = false,
}: {
	author?: ProjectAuthor | null;
	/** Render only the body — the caller supplies the frame and the title. */
	bare?: boolean;
}) {
	const { t } = useTranslate();

	if (!author) return null;

	const displayName = author.profile?.name || author.name || "—";
	const speciality = author.specialities?.[0];
	const position = speciality
		? [speciality.specialization || speciality.name, speciality.level]
				.filter(Boolean)
				.join(" · ")
		: null;
	const motivation = author.profile?.motivation;
	const initials = displayName.slice(0, 2).toUpperCase();

	const body = (
		<>
			<div className={styles.row}>
				<div className={styles.avatar}>
					{author.image ? (
						<AppImage
							src={author.image}
							alt={displayName}
							fill
							sizes="48px"
							style={{ objectFit: "cover" }}
						/>
					) : (
						<span>{initials}</span>
					)}
				</div>
				<div className={styles.meta}>
					<Text className={styles.name}>{displayName}</Text>
					{position && (
						<Text type="secondary" className={styles.position}>
							{position}
						</Text>
					)}
				</div>
			</div>
			{motivation && (
				<div className={styles.motivation}>
					<IconQuote size={16} className={styles.quoteIcon} />
					<Text className={styles.motivationText}>{motivation}</Text>
				</div>
			)}
		</>
	);

	if (bare) return body;

	return (
		<section className={getHubSectionShellClass("sidebar")}>
			<HubSectionHeader title={t("page.project.author", "Project author")} />
			<HubSectionBody>{body}</HubSectionBody>
		</section>
	);
}
