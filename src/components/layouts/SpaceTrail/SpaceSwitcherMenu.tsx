"use client";

import {
	type Icon,
	IconBinoculars,
	IconCheck,
	IconHeartHandshake,
	IconHome,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import Link from "next/link";
import type React from "react";
import { avatarImage } from "@/helpers/image";
import { projectSpaceHref } from "@/helpers/project-space";
import { useUserSpaces } from "@/hooks/useUserSpaces";
import type { UserSpaceGroup } from "@/repositories/user/spaces";
import styles from "./style.module.scss";
import type { CurrentSpace, SpaceKind } from "./types";

type GroupSpec = {
	kind: "project" | "event";
	title: string;
	viewAllHref: string;
	href: (space: { id: string; slug: string | null }) => string;
	group: UserSpaceGroup;
};

/** The initial on a tinted square, for a space with no cover of its own. */
function CoverSwatch({ name, url }: { name: string; url: string | null }) {
	if (url) {
		return (
			// A plain <img>: these are 26px and come from arbitrary hosts, so the
			// image pipeline would cost more than it saves.
			// biome-ignore lint/performance/noImgElement: 26px avatar from any host
			<img src={avatarImage(url, 26)} alt="" className={styles.swatch} />
		);
	}

	return (
		<span className={`${styles.swatch} ${styles.swatchEmpty}`} aria-hidden>
			{name.charAt(0).toUpperCase()}
		</span>
	);
}

function MenuRow({
	href,
	swatch,
	name,
	meta,
	isCurrent,
	onNavigate,
}: {
	href: string;
	swatch: React.ReactNode;
	name: string;
	meta?: string;
	isCurrent: boolean;
	onNavigate: () => void;
}) {
	return (
		<Link
			href={href}
			onClick={onNavigate}
			role="menuitem"
			className={styles.row}
			data-current={isCurrent || undefined}
			aria-current={isCurrent ? "page" : undefined}
		>
			{swatch}
			<span className={styles.rowText}>
				<span className={styles.rowName}>{name}</span>
				{meta && <span className={styles.rowMeta}>{meta}</span>}
			</span>
			{isCurrent && <IconCheck size={15} className={styles.rowCheck} />}
		</Link>
	);
}

function SpaceGroup({
	spec,
	currentId,
	onNavigate,
}: {
	spec: GroupSpec;
	currentId?: string;
	onNavigate: () => void;
}) {
	const { t } = useTranslate();

	if (!spec.group.items.length) return null;

	return (
		<div role="group" aria-label={spec.title}>
			<div className={styles.groupHead}>
				<span className={styles.groupTitle}>{spec.title}</span>
				<Link
					href={spec.viewAllHref}
					className={styles.viewAll}
					onClick={onNavigate}
				>
					{t("space.switcher.viewAll", "View all")} ›
				</Link>
			</div>

			<div className={styles.groupList}>
				{spec.group.items.map((space) => (
					<MenuRow
						key={space.id}
						href={spec.href(space)}
						swatch={<CoverSwatch name={space.name} url={space.coverUrl} />}
						name={space.name}
						meta={`${space.role} · ${space.status}`}
						isCurrent={space.id === currentId}
						onNavigate={onNavigate}
					/>
				))}
			</div>
		</div>
	);
}

/**
 * The switcher's contents: the single spaces first, then the user's own spaces
 * grouped by kind.
 *
 * Five per group, most recently joined first, with the rest behind "View all".
 * The admin space is not here on purpose — it belongs to the platform, not to
 * the person, and listing it would suggest otherwise.
 */
export function SpaceSwitcherMenu({
	current,
	onNavigate,
}: {
	current?: CurrentSpace;
	onNavigate: () => void;
}) {
	const { t } = useTranslate();

	const { data } = useUserSpaces();

	// Course spaces will get a group here once they exist.
	const groups: GroupSpec[] = data
		? [
				{
					kind: "project",
					title: t("space.switcher.projects", "Projects"),
					viewAllHref: "/hub",
					href: (space) => projectSpaceHref(space.slug ?? space.id),
					group: data.projects,
				},
				{
					kind: "event",
					title: t("space.switcher.events", "Events"),
					viewAllHref: "/user/events",
					href: (space) => `/user/event/${space.id}`,
					group: data.events,
				},
			]
		: [];

	// The logo goes home too, but was never discoverable — hence the hub row.
	const singles: {
		kind: SpaceKind;
		href: string;
		icon: Icon;
		label: string;
	}[] = [
		current?.kind !== "hub" && {
			kind: "hub" as const,
			href: "/hub",
			icon: IconHome,
			label: t("space.switcher.backToHub", "Back to Hub"),
		},
		data?.hasAdvisorSpace && {
			kind: "advisor" as const,
			href: "/advisor/requests",
			icon: IconHeartHandshake,
			label: t("space.switcher.advisor", "Advisor space"),
		},
		data?.hasScoutCabinet && {
			kind: "scout" as const,
			href: "/scout/games",
			icon: IconBinoculars,
			label: t("space.switcher.scout", "Scout space"),
		},
	].filter((row) => !!row);
	const hasSingles = singles.length > 0;
	const hasGroups = groups.some((spec) => spec.group.items.length > 0);

	/** Up and down walk the rows; the browser handles Enter on a link. */
	const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

		const items = [
			...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
		];
		if (!items.length) return;

		event.preventDefault();
		const at = items.indexOf(document.activeElement as HTMLElement);
		const step = event.key === "ArrowDown" ? 1 : -1;
		const next = at < 0 ? 0 : (at + step + items.length) % items.length;

		items[next].focus();
	};

	return (
		<div className={styles.menu} role="menu" onKeyDown={onKeyDown}>
			{hasSingles && (
				<div className={styles.singles}>
					{singles.map(({ kind, href, icon: RowIcon, label }) => (
						<MenuRow
							key={kind}
							href={href}
							swatch={
								<span
									className={`${styles.swatch} ${styles.swatchEmpty}`}
									aria-hidden
								>
									<RowIcon size={16} />
								</span>
							}
							name={label}
							isCurrent={current?.kind === kind}
							onNavigate={onNavigate}
						/>
					))}
				</div>
			)}

			{groups.map((spec) => (
				<SpaceGroup
					key={spec.kind}
					spec={spec}
					currentId={current?.id}
					onNavigate={onNavigate}
				/>
			))}

			{!hasSingles && !hasGroups && (
				<div className={styles.empty}>
					{t("space.switcher.empty", "Nothing here yet")}
				</div>
			)}
		</div>
	);
}
