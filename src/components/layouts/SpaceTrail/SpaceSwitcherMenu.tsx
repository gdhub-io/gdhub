"use client";

import { IconCheck, IconHome } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import axios from "axios";
import Link from "next/link";
import type React from "react";
import { avatarImage } from "@/helpers/image";
import type { UserSpaceGroup, UserSpaces } from "@/repositories/user-spaces";
import styles from "./style.module.scss";
import type { SpaceKind } from "./types";

type GroupSpec = {
	kind: SpaceKind;
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
				{spec.group.items.map((space) => {
					const isCurrent = space.id === currentId;

					return (
						<Link
							key={space.id}
							href={spec.href(space)}
							onClick={onNavigate}
							role="menuitem"
							className={styles.row}
							data-current={isCurrent || undefined}
							aria-current={isCurrent ? "page" : undefined}
						>
							<CoverSwatch name={space.name} url={space.coverUrl} />
							<span className={styles.rowText}>
								<span className={styles.rowName}>{space.name}</span>
								<span className={styles.rowMeta}>
									{space.role} · {space.status}
								</span>
							</span>
							{isCurrent && <IconCheck size={15} className={styles.rowCheck} />}
						</Link>
					);
				})}
			</div>
		</div>
	);
}

/**
 * The switcher's contents: the user's own spaces, grouped by kind.
 *
 * Five per group, most recently joined first, with the rest behind "View all".
 * The admin space is not here on purpose — it belongs to the platform, not to
 * the person, and listing it would suggest otherwise.
 */
export function SpaceSwitcherMenu({
	currentId,
	onNavigate,
}: {
	currentId?: string;
	onNavigate: () => void;
}) {
	const { t } = useTranslate();

	const { data } = useQuery<UserSpaces>({
		queryKey: ["user-spaces"],
		queryFn: () =>
			axios.get<UserSpaces>("/api/user/spaces").then((res) => res.data),
		staleTime: 60 * 1000,
	});

	const groups: GroupSpec[] = data
		? [
				{
					kind: "project",
					title: t("space.switcher.projects", "Projects"),
					viewAllHref: "/hub",
					href: (space) => `/user/project/${space.slug ?? space.id}`,
					group: data.projects,
				},
				{
					kind: "event",
					title: t("space.switcher.events", "Events"),
					viewAllHref: "/user/events",
					href: (space) => `/user/event/${space.id}`,
					group: data.events,
				},
				{
					kind: "course",
					title: t("space.switcher.courses", "Courses"),
					viewAllHref: "/user/courses",
					href: (space) => `/user/course/${space.slug ?? space.id}`,
					group: data.courses,
				},
			]
		: [];

	const hasAny = groups.some((spec) => spec.group.items.length > 0);

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
		// biome-ignore lint/a11y/noStaticElementInteractions: this is the menu
		// surface itself; the handler moves focus between its own items.
		<div className={styles.menu} role="menu" onKeyDown={onKeyDown}>
			{groups.map((spec) => (
				<SpaceGroup
					key={spec.kind}
					spec={spec}
					currentId={currentId}
					onNavigate={onNavigate}
				/>
			))}

			{!hasAny && (
				<div className={styles.empty}>
					{t("space.switcher.empty", "Nothing here yet")}
				</div>
			)}

			{/* The same destination as the logo, said in words. The logo alone was
			    never discoverable, which is the reason this menu exists. */}
			<Link
				href="/hub"
				role="menuitem"
				onClick={onNavigate}
				className={styles.homeRow}
			>
				<IconHome size={16} />
				{t("space.switcher.backToHub", "Back to Hub")}
			</Link>
		</div>
	);
}
