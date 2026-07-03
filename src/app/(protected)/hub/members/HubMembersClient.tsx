"use client";

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { InstantsearchAdapter } from "@gdhub-io/gdhub-typesense/dist/adapter";
import {
	IconCheck,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconClock,
	IconMapPin,
	IconSearch,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Popover } from "antd";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import {
	Configure,
	Highlight,
	InstantSearch,
	useClearRefinements,
	useCurrentRefinements,
	useHits,
	useInstantSearch,
	usePagination,
	useRefinementList,
	useSearchBox,
	useStats,
} from "react-instantsearch";
import { getWorkDirection } from "@/components/DirectionBadge";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { hasRole } from "@/helpers/user";
import styles from "./style.module.scss";

const SpecialistPreviewModal = dynamic(
	() => import("@/components/modals/SpecialistPreviewModal"),
	{ ssr: false },
);

// A specialist counts as "new" for two weeks after their card is created.
const NEW_WINDOW_DAYS = 140;
// Experience order + rank (drives the mini meter and dropdown ordering).
const LEVEL_RANK: Record<string, number> = {
	Novice: 1,
	Beginner: 2,
	Skillful: 3,
	Expert: 4,
};

export function HubMembersClient({
	usersCount,
	specialitiesCount,
	hasApprovedProjects = false,
}: {
	usersCount: number;
	specialitiesCount: number;
	hasApprovedProjects?: boolean;
}) {
	const session = useSession();
	const { t } = useTranslate();
	const [selectedSpecialistId, setSelectedSpecialistId] = useState<
		string | undefined
	>();

	const searchAdapter = useMemo(
		() =>
			new InstantsearchAdapter({
				host: process.env.NEXT_PUBLIC_TYPESENSE_HOST as string,
				port: Number.parseInt(
					process.env.NEXT_PUBLIC_TYPESENSE_PORT as string,
					10,
				),
				protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as string,
				apiKey: process.env.NEXT_PUBLIC_TYPESENSE_API_KEY as string,
				additionalSearchParameters: {
					query_by:
						"name,city,country,schools,jobs,tools,skills,direction,specialization",
					// Freshest first when browsing; relevance stays first while searching.
					sort_by: "_text_match:desc,createdAt:desc",
				},
			}),
		[],
	);

	if (!hasRole(prismaClient.UserRole.Author, session) || !hasApprovedProjects) {
		return (
			<div className="layout-background">
				<ProtectedPageHeader title={t("Community Members")} />
				<div className={styles.container}>
					<p>
						{t(
							"page.hub.members.text1",
							"Any registered user of our portal is considered a community member. Today we are",
						)}{" "}
						<strong>{usersCount}</strong>.
					</p>
					<p>
						{t(
							"page.hub.members.text2.part1",
							"Those of us who have indicated a major in our profile are considered members who are open to offers to participate in the development of indie projects. As of today",
						)}{" "}
						<strong>{specialitiesCount}</strong>{" "}
						{t("page.hub.members.text2.part2", "specialists are registered.")}
					</p>
					<p>
						{t(
							"page.hub.members.text3",
							"Authors of indie projects have access to a database of specialists and can invite them to their projects. For this you need to create a project and and bring your project to the recruiting stage.",
						)}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="layout-background">
			<ProtectedPageHeader title={t("Community Members")} />
			<div className={styles.container}>
				<InstantSearch
					searchClient={searchAdapter.searchClient}
					indexName={
						process.env.NEXT_PUBLIC_TYPESENSE_SPECIALISTS_SCHEMA as string
					}
					future={{ preserveSharedStateOnUnmount: true }}
				>
					<Configure optionalFilters={["isActive:true"]} hitsPerPage={12} />

					<div className={styles.header}>
						<div className={styles.titleBlock}>
							<Subtitle />
						</div>
						<div className={styles.controls}>
							<FilterDropdown
								attribute="direction"
								label={t("hub.members.direction", "Direction")}
								variant="direction"
							/>
							<FilterDropdown
								attribute="level"
								label={t("hub.members.level", "Experience")}
								variant="level"
							/>
							<ClearAll />
						</div>
					</div>

					<SearchInput />
					<Results onSelect={setSelectedSpecialistId} />
					<PoolPagination />

					<SpecialistPreviewModal
						open={!!selectedSpecialistId}
						specialistId={selectedSpecialistId}
						onCancel={() => setSelectedSpecialistId(undefined)}
					/>
				</InstantSearch>
			</div>
		</div>
	);
}

/* ---------------- header ---------------- */

function Subtitle() {
	const { nbHits } = useStats();
	const { t } = useTranslate();
	return (
		<p className={styles.subtitle}>
			{t("hub.members.subtitle", "{count} specialists open to collaborate", {
				count: nbHits,
			})}
		</p>
	);
}

/* ---------------- filters ---------------- */

function FilterDropdown({
	attribute,
	label,
	variant,
}: {
	attribute: string;
	label: string;
	variant: "direction" | "level";
}) {
	const { t } = useTranslate();
	const { items, refine } = useRefinementList({
		attribute,
		limit: 40,
		sortBy: variant === "direction" ? ["count:desc", "name:asc"] : undefined,
	});
	const { refine: clearFacet, canRefine: canClearFacet } = useClearRefinements({
		includedAttributes: [attribute],
	});
	const [open, setOpen] = useState(false);

	const ordered =
		variant === "level"
			? [...items].sort(
					(a, b) => (LEVEL_RANK[a.label] || 99) - (LEVEL_RANK[b.label] || 99),
				)
			: items;
	const selected = items.filter((i) => i.isRefined).length;

	const content = (
		<div className={styles.panel}>
			<div className={styles.panelList}>
				{ordered.map((item) => (
					<button
						key={item.value}
						type="button"
						className={`${styles.panelRow} ${
							item.isRefined ? styles.panelRowActive : ""
						}`}
						onClick={() => refine(item.value)}
					>
						<span className={styles.panelLeft}>
							<span
								className={`${styles.checkbox} ${
									item.isRefined ? styles.checkboxOn : ""
								}`}
							>
								{item.isRefined && <IconCheck size={12} color="#fff" />}
							</span>
							{variant === "direction" ? (
								<DirectionChip name={item.label} />
							) : (
								<LevelMeter level={LEVEL_RANK[item.label] || 0} />
							)}
							<span className={styles.panelLabel}>{item.label}</span>
						</span>
						<span className={styles.panelCount}>{item.count}</span>
					</button>
				))}
			</div>
			<div className={styles.panelFooter}>
				<button
					type="button"
					className={styles.panelClear}
					onClick={() => clearFacet()}
					disabled={!canClearFacet}
				>
					{t("hub.members.clear", "Clear")}
				</button>
				<button
					type="button"
					className={styles.panelDone}
					onClick={() => setOpen(false)}
				>
					{t("hub.members.done", "Done")}
				</button>
			</div>
		</div>
	);

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
			trigger="click"
			placement="bottomLeft"
			classNames={{ root: styles.popoverRoot }}
			content={content}
		>
			<button
				type="button"
				className={`${styles.filterBtn} ${
					selected > 0 ? styles.filterBtnActive : ""
				}`}
			>
				<span>
					{label}: {selected > 0 ? selected : t("hub.members.all", "All")}
				</span>
				<IconChevronDown size={14} />
			</button>
		</Popover>
	);
}

function DirectionChip({ name }: { name: string }) {
	const { icon: Icon, color } = getWorkDirection(name);
	return (
		<span className={styles.dirChip} style={{ background: color }}>
			<Icon size={13} stroke={2} color="#181818" />
		</span>
	);
}

function LevelMeter({ level }: { level: number }) {
	return (
		<span className={styles.meter}>
			{[1, 2, 3, 4].map((i) => (
				<span
					key={i}
					className={`${styles.dot} ${i <= level ? styles.dotOn : ""}`}
				/>
			))}
		</span>
	);
}

function ClearAll() {
	const { items } = useCurrentRefinements();
	const { refine } = useClearRefinements();
	const { t } = useTranslate();
	if (items.length === 0) return null;
	return (
		<button type="button" className={styles.clearAll} onClick={() => refine()}>
			<IconX size={14} />
			{t("Clear all", "Clear all")}
		</button>
	);
}

/* ---------------- search + stats ---------------- */

function SearchInput() {
	const { query, refine } = useSearchBox();
	const { t } = useTranslate();
	return (
		<div className={styles.search}>
			<IconSearch size={16} className={styles.searchIcon} />
			<input
				className={styles.searchInput}
				value={query}
				onChange={(e) => refine(e.target.value)}
				placeholder={t(
					"hub.members.searchPlaceholder",
					"Search by name, role or skill…",
				)}
			/>
		</div>
	);
}

/* ---------------- results ---------------- */

function Results({ onSelect }: { onSelect: (id: string) => void }) {
	const { items } = useHits();
	const { status, results } = useInstantSearch();

	const initialLoading =
		(results as { __isArtificial?: boolean }).__isArtificial ||
		(status === "loading" && items.length === 0);

	if (initialLoading) return <SkeletonGrid />;
	if (items.length === 0) return <NoResults query={results.query} />;

	return (
		<div className={styles.grid}>
			{items.map((hit: any) => (
				<HitCard
					key={hit.objectID}
					hit={hit}
					onClick={() => onSelect(hit.id ?? hit.objectID)}
				/>
			))}
		</div>
	);
}

function HitCard({ hit, onClick }: { hit: any; onClick: () => void }) {
	const { icon: Icon, color } = getWorkDirection(hit.direction || "other");
	const isNew =
		typeof hit.createdAt === "number" &&
		Date.now() / 1000 - hit.createdAt < NEW_WINDOW_DAYS * 86400;
	const location = [hit.country, hit.city].filter(Boolean).join(", ");
	const skills: string[] = Array.isArray(hit.skills)
		? hit.skills
		: hit.skills
			? [hit.skills]
			: [];
	const hasFreeTime = hit.timeForWorkMin != null && hit.timeForWorkMax != null;

	return (
		<button type="button" className={styles.card} onClick={onClick}>
			<div className={styles.cardTop}>
				<span className={styles.avatar} style={{ background: color }}>
					<Icon size={22} stroke={2} color="#181818" />
				</span>
				<div className={styles.cardCol}>
					<div className={styles.badgeRow}>
						{!!hit.level && (
							<span className={styles.levelBadge}>{hit.level}</span>
						)}
						{isNew && <span className={styles.newBadge}>New</span>}
					</div>
					<span className={styles.cardName}>
						<Highlight attribute="name" hit={hit} />
					</span>
					{(location || hasFreeTime) && (
						<div className={styles.metaRow}>
							{!!location && (
								<span className={styles.metaItem}>
									<IconMapPin size={12} />
									{location}
								</span>
							)}
							{hasFreeTime && (
								<span className={styles.metaItem}>
									<IconClock size={12} />
									{hit.timeForWorkMin}–{hit.timeForWorkMax} h/week
								</span>
							)}
						</div>
					)}
				</div>
			</div>

			{!!hit.specialization && (
				<div className={styles.cardDesc}>
					<Highlight attribute="specialization" hit={hit} />
				</div>
			)}

			{skills.length > 0 && (
				<div className={styles.tagRow}>
					{skills.slice(0, 3).map((s, i) => (
						<span key={`${s}-${i.toString()}`} className={styles.tag}>
							{s}
						</span>
					))}
					{skills.length > 3 && (
						<span className={styles.tag}>+{skills.length - 3}</span>
					)}
				</div>
			)}
		</button>
	);
}

function SkeletonGrid() {
	return (
		<div className={styles.grid}>
			{[0, 1, 2].map((i) => (
				<div key={i} className={styles.skCard}>
					<div className={styles.skTop}>
						<span className={styles.skAvatar} />
						<div className={styles.skCol}>
							<span className={styles.skLine} style={{ width: 56 }} />
							<span
								className={styles.skLine}
								style={{ width: 150, height: 16 }}
							/>
							<span className={styles.skLine} style={{ width: 110 }} />
						</div>
					</div>
					<span className={styles.skLine} style={{ width: "100%" }} />
					<span className={styles.skLine} style={{ width: "70%" }} />
					<div className={styles.skTags}>
						<span className={styles.skTag} />
						<span className={styles.skTag} />
						<span className={styles.skTag} />
					</div>
				</div>
			))}
		</div>
	);
}

function NoResults({ query }: { query?: string }) {
	const { t } = useTranslate();
	return (
		<div className={styles.noResults}>
			<IconSearch size={28} />
			<p>
				{query
					? t("hub.members.noResultsFor", "No specialists match “{query}”.", {
							query,
						})
					: t("hub.members.noResults", "No specialists match your filters.")}
			</p>
		</div>
	);
}

/* ---------------- pagination ---------------- */

function PoolPagination() {
	const { pages, currentRefinement, nbPages, isFirstPage, isLastPage, refine } =
		usePagination({ padding: 2 });

	if (nbPages <= 1) return null;

	return (
		<div className={styles.pagination}>
			<button
				type="button"
				className={styles.pageBtn}
				disabled={isFirstPage}
				onClick={() => refine(currentRefinement - 1)}
			>
				<IconChevronLeft size={15} />
			</button>
			{pages[0] > 0 && (
				<>
					<PageBtn page={0} current={currentRefinement} refine={refine} />
					{pages[0] > 1 && <span className={styles.pageDots}>…</span>}
				</>
			)}
			{pages.map((page) => (
				<PageBtn
					key={page}
					page={page}
					current={currentRefinement}
					refine={refine}
				/>
			))}
			{pages[pages.length - 1] < nbPages - 1 && (
				<>
					{pages[pages.length - 1] < nbPages - 2 && (
						<span className={styles.pageDots}>…</span>
					)}
					<PageBtn
						page={nbPages - 1}
						current={currentRefinement}
						refine={refine}
					/>
				</>
			)}
			<button
				type="button"
				className={styles.pageBtn}
				disabled={isLastPage}
				onClick={() => refine(currentRefinement + 1)}
			>
				<IconChevronRight size={15} />
			</button>
		</div>
	);
}

function PageBtn({
	page,
	current,
	refine,
}: {
	page: number;
	current: number;
	refine: (page: number) => void;
}) {
	return (
		<button
			type="button"
			className={`${styles.pageBtn} ${
				page === current ? styles.pageBtnActive : ""
			}`}
			onClick={() => refine(page)}
		>
			{page + 1}
		</button>
	);
}
