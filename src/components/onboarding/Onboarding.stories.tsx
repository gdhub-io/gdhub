import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { ReactElement } from "react";
import { WORK_DIRECTIONS } from "@/components/DirectionBadge";
import { PrimaryInterest, SkillLevel } from "@/config/prisma-enums";
import { OnboardingCompleted } from "./OnboardingCompleted";
import { OnboardingError } from "./OnboardingError";
import { OnboardingInterestStep } from "./OnboardingInterestStep";
import { OnboardingLayout } from "./OnboardingLayout";
import { OnboardingProfileStep } from "./OnboardingProfileStep";
import { OnboardingResourceStep } from "./OnboardingResourceStep";
import { OnboardingSpecialityStep } from "./OnboardingSpecialityStep";
import { OnboardingWelcome } from "./OnboardingWelcome";

const USER_ID = "usr-1";

const SESSION: Session = {
	expires: "2099-01-01T00:00:00.000Z",
	user: {
		id: USER_ID,
		name: "Dima Ivanou",
		email: "dima@gdhub.io",
		image: "",
		roles: [],
		onboardingDone: false,
		lang: "en",
	},
};

/** Every step reads its saved answers from `/api/auth/registration/onboarding/*`. */
const PROFILE = {
	name: "Dima Ivanou",
	yearOfBirth: 1994,
	country: "Belarus",
	city: "Minsk",
	user: { agreements: { confirmUserData: true } },
	primaryInterest: PrimaryInterest.Author,
	timeForWork: [10, 20],
	isActive: true,
	otherResources:
		"A small home studio, a Unity Pro seat and a community of playtesters.",
};

/** Dictionary rows as the API returns them — the id is what the form stores. */
const WORK_DIRECTION_ROWS = WORK_DIRECTIONS.map((direction, index) => ({
	id: `wd-${index + 1}`,
	name: direction.label,
}));

const SPECIALITY = {
	id: "spc-1",
	name: "Game Designer",
	level: SkillLevel.Experienced,
	direction: WORK_DIRECTION_ROWS.find((d) => d.name === "game design"),
	specialization:
		"Systems and economy design for cooperative survival games, from the first paper prototype to live balancing.",
	portfolioUrl: "https://gdhub.io/portfolio/dima",
	skills: "Systems design\nEconomy balancing\nLevel scripting",
	tools: "Unity\nMiro\nNotion",
	summary: "8 years in indie and mid-size studios.",
	jobs: "2021 - 2026, Lead Game Designer, Echo Signal\n2018 - 2021, Game Designer, Northline",
	schools: "2012 - 2017, Applied Mathematics, BSU",
};

const GAME_GENRES = [
	{ id: "gen-1", name: "Action" },
	{ id: "gen-2", name: "Adventure" },
	{ id: "gen-3", name: "Puzzle" },
	{ id: "gen-4", name: "Strategy" },
];

const GAME_SETTINGS = [
	{ id: "set-1", name: "Sci-Fi" },
	{ id: "set-2", name: "Fantasy" },
	{ id: "set-3", name: "Post-apocalyptic" },
];

const GAME_LEVELS = [
	{ id: "lvl-1", name: "Casual" },
	{ id: "lvl-2", name: "Midcore" },
	{ id: "lvl-3", name: "Hardcore" },
];

type Seed = {
	/** Saved profile, interests and resources — all three share one query key. */
	profile?: unknown;
	/** Saved main speciality. */
	speciality?: unknown;
	/** `/api/user/me`, read by the completed screen to pick up team invitations. */
	currentUser?: unknown;
};

/**
 * The steps read everything through TanStack Query, so the stories seed the
 * cache under the exact query keys instead of mocking the network — with an
 * infinite `staleTime` nothing is refetched over axios. A session is provided
 * too: the profile, interests and resources queries are keyed by the user id
 * and stay disabled without one.
 */
function withOnboardingData({
	profile = PROFILE,
	speciality = SPECIALITY,
	currentUser = { pendingTeamInvitations: [] },
}: Seed = {}) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});

	client.setQueryData(["profile", USER_ID], { data: profile });
	client.setQueryData(["onboarding", "speciality"], { data: speciality });
	client.setQueryData(["workDirections"], { data: WORK_DIRECTION_ROWS });
	client.setQueryData(["gameGenres"], { data: GAME_GENRES });
	client.setQueryData(["gameSettings"], { data: GAME_SETTINGS });
	client.setQueryData(["gameLevels"], { data: GAME_LEVELS });
	client.setQueryData(["user", "current"], { data: currentUser });

	return (Story: () => ReactElement) => (
		<SessionProvider session={SESSION}>
			<QueryClientProvider client={client}>
				<Story />
			</QueryClientProvider>
		</SessionProvider>
	);
}

const noop = () => {};

/**
 * Every screen of the registration onboarding, in the chrome the page renders
 * around them (`OnboardingLayout`): the welcome and completed screens are
 * centred and have no progress, the four steps carry the title and the step
 * bar. Saving is a network call, so the footer buttons do not advance here —
 * open the next story instead.
 */
const meta: Meta<typeof OnboardingLayout> = {
	title: "Pages/Onboarding",
	component: OnboardingLayout,
	parameters: { layout: "fullscreen" },
	decorators: [withOnboardingData()],
};

export default meta;

type Story = StoryObj<typeof OnboardingLayout>;

/** Entry screen — full page, no progress bar. */
export const Welcome: Story = {
	args: { step: null, children: <OnboardingWelcome onNext={noop} /> },
};

/** Step 1 for a brand new user: nothing to prefill, empty form. */
export const ProfileStep: Story = {
	args: {
		step: 0,
		children: <OnboardingProfileStep onLoading={noop} onSave={noop} />,
	},
	decorators: [withOnboardingData({ profile: {} })],
};

/** Step 1 revisited — the saved answers are put back into the form. */
export const ProfileStepFilled: Story = {
	args: {
		step: 0,
		children: <OnboardingProfileStep onLoading={noop} onSave={noop} />,
	},
};

/** Step 2 — main speciality, with the optional fields collapsed. */
export const SpecialityStep: Story = {
	args: {
		step: 1,
		children: <OnboardingSpecialityStep onSave={noop} onPreviousStep={noop} />,
	},
};

/** Step 2 for a new user: no speciality yet, so the CV upload stays hidden. */
export const SpecialityStepEmpty: Story = {
	args: {
		step: 1,
		children: <OnboardingSpecialityStep onSave={noop} onPreviousStep={noop} />,
	},
	decorators: [withOnboardingData({ speciality: null })],
};

/** Step 3 — the three interest cards plus genre/setting/difficulty pickers. */
export const InterestsStep: Story = {
	args: {
		step: 2,
		children: <OnboardingInterestStep onSave={noop} onPreviousStep={noop} />,
	},
};

/** Step 4 — weekly hours and whatever else the member brings to a team. */
export const ResourcesStep: Story = {
	args: {
		step: 3,
		children: <OnboardingResourceStep onSave={noop} onPreviousStep={noop} />,
	},
};

/** Final screen — full page again, the step bar is gone. */
export const Completed: Story = {
	args: { step: null, children: <OnboardingCompleted /> },
};

/**
 * Completed with a `pendingInvitation` in the URL: the screen accepts the team
 * invitation first and shows a spinner until the redirect.
 */
export const CompletedWithInvitation: Story = {
	args: { step: null, children: <OnboardingCompleted /> },
	parameters: {
		nextjs: {
			appDirectory: true,
			navigation: { query: { pendingInvitation: "inv-1" } },
		},
	},
};

/** Dead end: onboarding could not be started, the user is sent back to sign-up. */
export const ErrorScreen: Story = {
	name: "Error",
	render: () => (
		<OnboardingError error="Your registration link is no longer valid." />
	),
};
