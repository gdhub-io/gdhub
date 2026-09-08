import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

/**
 * Every OG card the platform generates, in one place.
 *
 * These are live renders: each frame points at a running app and shows what
 * `@vercel/og` actually produced, fonts and cropping included — which is the
 * only way to catch the things that break here (a title that overflows, a cover
 * that fails to fetch, a glyph the font lacks). Start the app with
 * `bun run dev` before opening these stories.
 *
 * The routes live under `src/app/api/og-...` and all share
 * `src/helpers/og-font.ts` + `src/helpers/og-palette.ts`.
 */

const DEFAULT_BASE = "http://localhost:3000";

/** A cover the dev server can fetch without leaving the machine. */
const SAMPLE_COVER = "/images/new-project.png";

type CardSpec = {
	label: string;
	endpoint: string;
	params: Record<string, string>;
	/** Rendered size of the card, for the aspect ratio of the frame. */
	size: [number, number];
};

const abs = (base: string, path: string) =>
	path.startsWith("http") ? path : `${base}${path}`;

const buildUrl = (base: string, spec: CardSpec) => {
	const params = new URLSearchParams(spec.params);
	if (spec.params.img) params.set("img", abs(base, spec.params.img));
	return `${base}${spec.endpoint}?${params.toString()}`;
};

const Card = ({ base, spec }: { base: string; spec: CardSpec }) => {
	const [failed, setFailed] = useState(false);
	const url = buildUrl(base, spec);
	const [w, h] = spec.size;

	return (
		<figure
			style={{
				margin: 0,
				display: "flex",
				flexDirection: "column",
				gap: 10,
				minWidth: 0,
			}}
		>
			<figcaption
				style={{
					fontSize: 13,
					fontWeight: 600,
					color: "var(--gd-color-text)",
					fontFamily: "var(--gd-font-ui), system-ui, sans-serif",
				}}
			>
				{spec.label}
			</figcaption>

			{failed ? (
				<div
					style={{
						aspectRatio: `${w} / ${h}`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: 24,
						textAlign: "center",
						borderRadius: "var(--gd-radius-card)",
						border: "1px dashed var(--gd-color-border-strong)",
						background: "var(--gd-color-surface-sunken)",
						color: "var(--gd-color-text-secondary)",
						fontSize: 13,
						fontFamily: "var(--gd-font-ui), system-ui, sans-serif",
						lineHeight: 1.5,
					}}
				>
					Could not render this card. Is the app running at {base}? Start it
					with <code style={{ margin: "0 4px" }}>bun run dev</code> and reload.
				</div>
			) : (
				// biome-ignore lint/performance/noImgElement: the point of the story is the raw generated PNG
				<img
					src={url}
					alt={spec.label}
					width={w}
					height={h}
					onError={() => setFailed(true)}
					style={{
						width: "100%",
						height: "auto",
						borderRadius: "var(--gd-radius-card)",
						border: "1px solid var(--gd-color-border)",
						background: "var(--gd-color-surface-sunken)",
					}}
				/>
			)}
		</figure>
	);
};

const Grid = ({
	base,
	specs,
	columns = 2,
}: {
	base: string;
	specs: CardSpec[];
	columns?: number;
}) => (
	<div
		style={{
			display: "grid",
			gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
			gap: 32,
			padding: 24,
			background: "var(--gd-color-bg)",
		}}
	>
		{specs.map((spec) => (
			<Card key={spec.label} base={base} spec={spec} />
		))}
	</div>
);

const SPECS = {
	generic: {
		label: "Project / landing — /api/og",
		endpoint: "/api/og",
		size: [1200, 630],
		params: {
			t: "Hollow Tide",
			st: "Author Anna Kovalenko",
			img: SAMPLE_COVER,
		},
		// Used by the project page and the landing. Works without a cover — see the
		// fallback in Edge cases.
	},
	blog: {
		label: "Blog / devlog — /api/og-blog",
		endpoint: "/api/og-blog",
		size: [1200, 630],
		params: {
			t: "Six weeks of level streaming",
			u: "gdhub.io/devlog",
		},
		// The only card that works without a cover: every devlog announcement gets a
		// branded fallback. Built by src/services/telegram/messages.ts.
	},
	blogWithCover: {
		label: "Blog / devlog with cover — /api/og-blog",
		endpoint: "/api/og-blog",
		size: [1200, 630],
		params: {
			t: "Six weeks of level streaming",
			u: "gdhub.io/devlog",
			img: SAMPLE_COVER,
		},
	},
	jobPaidMonthly: {
		label: "Vacancy — paid, monthly",
		endpoint: "/api/og-job",
		size: [1200, 630],
		params: {
			t: "Unity Gameplay Programmer",
			st: "Hollow Tide",
			dir: "development",
			vAmount: "3200",
			vRate: "Monthly",
			vDate: "29 Apr 2026",
		},
		// Paid wins over equity, the same precedence VacancyCard uses on the jobs
		// board. vAmount is in euros — the API converts from the minor units the
		// column stores.
	},
	jobPaidHourly: {
		label: "Vacancy — paid, hourly",
		endpoint: "/api/og-job",
		size: [1200, 630],
		params: {
			t: "Character Artist",
			st: "Hollow Tide",
			dir: "2d art & animation",
			vAmount: "45",
			vRate: "Hourly",
			vDate: "12 May 2026",
		},
	},
	jobPaidOneTime: {
		label: "Vacancy — paid, one-time",
		endpoint: "/api/og-job",
		size: [1200, 630],
		params: {
			t: "Technical Artist",
			st: "Moonfall",
			dir: "technical art",
			vAmount: "1500",
			vRate: "OneTime",
			vDate: "3 Jun 2026",
		},
	},
	jobEquity: {
		label: "Vacancy — for equity",
		endpoint: "/api/og-job",
		size: [1200, 630],
		params: {
			t: "Game Designer",
			st: "Starbound Saga",
			dir: "game design",
			vTerms: "5.0",
			vDate: "29 Apr 2026",
		},
		// vTerms is the equity percentage — the card prints `Equity offered:
		// {vTerms}%`, so anything but a number reads as nonsense.
	},
	jobExperience: {
		label: "Vacancy — for experience",
		endpoint: "/api/og-job",
		size: [1200, 630],
		params: {
			t: "QA Tester",
			st: "Moonfall",
			dir: "qa",
			vDate: "18 Jul 2026",
		},
		// No amount and no equity — the third branch, worded exactly as VacancyCard
		// words it.
	},
	eventBig: {
		label: "Event, large — /api/og-event-big",
		endpoint: "/api/og-event-big",
		size: [1200, 630],
		params: {
			t: "GDHub Meetup: shipping on console",
			st: "Berlin · Alexanderplatz",
			type: "meetup",
			date: "12 Jun 2026",
			img: SAMPLE_COVER,
		},
	},
	eventSmall: {
		label: "Event, small — /api/og-event-small",
		endpoint: "/api/og-event-small",
		size: [1200, 630],
		params: {
			t: "GDHub Meetup: shipping on console",
			st: "Berlin · Alexanderplatz",
			type: "meetup",
			date: "12 Jun 2026",
			img: SAMPLE_COVER,
		},
	},
} satisfies Record<string, CardSpec>;

type StoryArgs = { base: string };

const meta: Meta<StoryArgs> = {
	title: "OG images/Previews",
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Live renders of every OG card. Requires the app running at the base URL below — the images are fetched from it, not mocked.",
			},
		},
	},
	argTypes: {
		base: {
			control: "text",
			description: "Origin of the running app the cards are fetched from.",
		},
	},
	args: { base: DEFAULT_BASE },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const ProjectAndLanding: Story = {
	render: ({ base }) => (
		<Grid base={base} specs={[SPECS.generic]} columns={1} />
	),
};

export const BlogAndDevlog: Story = {
	render: ({ base }) => (
		<Grid base={base} specs={[SPECS.blog, SPECS.blogWithCover]} />
	),
};

/**
 * Every way a vacancy can pay. The three branches are mutually exclusive and
 * resolve in this order — paid, equity, experience — matching `VacancyCard`,
 * so the card in a shared link promises what the card on the board promises.
 */
export const Vacancy: Story = {
	render: ({ base }) => (
		<Grid
			base={base}
			specs={[
				SPECS.jobPaidMonthly,
				SPECS.jobPaidHourly,
				SPECS.jobPaidOneTime,
				SPECS.jobEquity,
				SPECS.jobExperience,
			]}
		/>
	),
};

export const Events: Story = {
	render: ({ base }) => (
		<Grid base={base} specs={[SPECS.eventBig, SPECS.eventSmall]} />
	),
};

/**
 * The inputs that actually break these cards: text far longer than the design
 * allows, a cover that 404s, and non-Latin glyphs the font has to cover.
 */
export const EdgeCases: Story = {
	render: ({ base }) => (
		<Grid
			base={base}
			specs={[
				{
					...SPECS.jobPaidMonthly,
					label: "Long title — does it clamp or overflow?",
					params: {
						...SPECS.jobPaidMonthly.params,
						t: "Senior Technical Artist for Real-Time Cinematics and Procedural Environment Pipelines",
					},
					// The route slices the title at 45 characters and appends an ellipsis.
				},
				{
					...SPECS.blog,
					label: "Em dash and figures — the reason the family changed",
					params: {
						...SPECS.blog.params,
						t: "Six weeks of level streaming — Hollow Tide",
					},
					// Onest covers latin, latin-ext and cyrillic, so a mixed line stays in
					// one face. Jakarta Sans drew tofu on the wider ranges and satori has no
					// fallback to rescue it.
				},
				{
					...SPECS.eventBig,
					label: "Broken cover URL",
					params: {
						...SPECS.eventBig.params,
						img: "/images/does-not-exist.png",
					},
					// The event routes require img; a cover that fails to fetch is the realistic
					// failure, not a missing param.
				},
				{
					...SPECS.generic,
					label: "No cover — branded fallback",
					params: { t: "Hollow Tide", st: "Author Anna Kovalenko" },
					// Project.coverImage is nullable, so this is the card every cover-less project
					// shares. It used to render the literal word "Error"; it now falls back to the
					// brand gradient, same as og-blog.
				},
				{
					...SPECS.jobEquity,
					label: "Unknown direction",
					params: {
						...SPECS.jobEquity.params,
						dir: "underwater basket weaving",
					},
					// getWorkDirection falls back to the `other` pair rather than throwing, so a
					// direction the seed list does not know still renders a card.
				},
			]}
		/>
	),
};
