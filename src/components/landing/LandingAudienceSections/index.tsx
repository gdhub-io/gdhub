import {
	IconActivity,
	IconDeviceGamepad2,
	IconDiscountCheck,
	IconFlag,
	IconHeartHandshake,
	IconLayoutGrid,
	IconMessageCircle,
	IconRocket,
	IconSearch,
	IconTrendingUp,
	IconUsers,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import AuthorsArt from "@/assets/images/landing/v2/authors-art.webp";
import ExpertsArt from "@/assets/images/landing/v2/experts-art.webp";
import ScoutsArt from "@/assets/images/landing/v2/scouts-art.webp";
import TalentsArt from "@/assets/images/landing/v2/talents-art.webp";
import {
	ProjectStoreCard,
	type StorefrontLink,
} from "@/components/project/cards";
import { VacancyCard } from "@/components/VacancyCard";
import { ContactTopic } from "@/config/contact";
import type { LandingData } from "@/repositories/landing.repository";
import {
	AudienceAction,
	AudienceSection,
	AudienceStrip,
} from "../AudienceSection";
import buttons from "../buttons.module.scss";
import {
	LandingExpertCard,
	LandingProjectCard,
	LandingTalentCard,
} from "../LandingStripCards";

const ContactModal = dynamic(() =>
	import("../ContactModal").then((m) => m.ContactModal),
);

const BRAND = "var(--gd-color-accent)";
const AMBER = "var(--gd-color-accent-alt)";
const LIGHT = "var(--gd-color-text)";

function Register({
	href,
	amber,
	note,
}: {
	href: string;
	/** The talents' accent instead of the brand. */
	amber?: boolean;
	note: string;
}) {
	const { t } = useTranslate();

	return (
		<AudienceAction
			note={note}
			button={
				<Link href={href}>
					<Button
						size="large"
						type={amber ? "default" : "primary"}
						className={amber ? buttons.amber : buttons.cta}
						block
					>
						{t("landing.register", "Register")}
					</Button>
				</Link>
			}
		/>
	);
}

export function LandingAuthorsSection({
	projects,
}: Pick<LandingData, "projects">) {
	const { t } = useTranslate();

	return (
		<AudienceSection
			anchor="authors"
			art={AuthorsArt}
			artSide="right"
			accent={BRAND}
			title={t("landing.authors.title", "Anyone can make a game today")}
			lead={t(
				"landing.authors.lead",
				"Tools let everyone create. Your own experience plus advice from game industry experts turns an idea into a game players haven't seen before.",
			)}
			lines={[
				{
					icon: IconUsers,
					lead: t("landing.authors.line1.lead", "Find the people"),
					rest: t(
						"landing.authors.line1.rest",
						"your game is missing — designers, programmers, artists, sound designers.",
					),
				},
				{
					icon: IconHeartHandshake,
					lead: t("landing.authors.line2.lead", "Hire your way:"),
					rest: t(
						"landing.authors.line2.rest",
						"for experience, for a share of the game or for pay — post a free or a paid open position.",
					),
				},
				{
					icon: IconRocket,
					lead: t("landing.authors.line3.lead", "Keep it moving:"),
					rest: t(
						"landing.authors.line3.rest",
						"devlogs show progress and a Checkpoint takes you to the next milestone.",
					),
				},
			]}
			strip={
				projects.length > 0 && (
					<AudienceStrip
						title={t("landing.authors.strip", "Games authors are building")}
					>
						{projects.map((project) => (
							<LandingProjectCard key={project.id} project={project} />
						))}
					</AudienceStrip>
				)
			}
			action={
				<Register
					href="/registration?for=author"
					note={t("landing.authors.ctaNote", "and create your first project")}
				/>
			}
		/>
	);
}

export function LandingTalentsSection({
	vacancies,
	talents,
}: Pick<LandingData, "vacancies" | "talents">) {
	const { t } = useTranslate();

	const strip =
		vacancies.length > 0 ? (
			<AudienceStrip
				title={t(
					"landing.talents.strip",
					"Who teams are looking for right now",
				)}
			>
				{vacancies.map((vacancy) => (
					<VacancyCard
						key={vacancy.id}
						directionName={vacancy.directionName}
						title={vacancy.title}
						projectName={vacancy.projectName ?? undefined}
						finishedAt={vacancy.finishedAt}
						promisePercentage={vacancy.promisePercentage}
						offeredAmount={vacancy.offeredAmount}
						offeredRateType={vacancy.offeredRateType}
						validUntilLabel={t("vacancies.list.validUntil", "Relevant to")}
						detailsLabel={t("job-card.details-button", "Details")}
						detailsHref={`/job/${vacancy.id}`}
					/>
				))}
			</AudienceStrip>
		) : (
			talents.length > 0 && (
				<AudienceStrip
					title={t("landing.talents.stripJoined", "Talents who just joined")}
				>
					{talents.map((talent) => (
						<LandingTalentCard key={talent.id} talent={talent} />
					))}
				</AudienceStrip>
			)
		);

	return (
		<AudienceSection
			anchor="talents"
			art={TalentsArt}
			artSide="left"
			accent={AMBER}
			title={t("landing.talents.title", "Put your craft into a real game")}
			lead={t(
				"landing.talents.lead",
				"Game designers, developers, artists and sound designers join projects being built right now.",
			)}
			lines={[
				{
					icon: IconDeviceGamepad2,
					lead: t("landing.talents.line1.lead", "Join a project"),
					rest: t(
						"landing.talents.line1.rest",
						"in development and ship real work for your portfolio.",
					),
				},
				{
					icon: IconSearch,
					lead: t("landing.talents.line2.lead", "Get found:"),
					rest: t(
						"landing.talents.line2.rest",
						"your profile shows your speciality, level and projects to authors looking for people.",
					),
				},
				{
					icon: IconTrendingUp,
					lead: t("landing.talents.line3.lead", "Grow into an expert"),
					rest: t(
						"landing.talents.line3.rest",
						"by answering questions from other teams.",
					),
				},
			]}
			strip={strip}
			action={
				<Register
					href="/registration?for=specialist"
					amber
					note={t(
						"landing.talents.ctaNote",
						"and apply to open positions in projects",
					)}
				/>
			}
		/>
	);
}

export function LandingScoutsSection({
	storeProjects,
}: Pick<LandingData, "storeProjects">) {
	const { t } = useTranslate();
	const [requesting, setRequesting] = useState<boolean | null>(null);

	return (
		<>
			<AudienceSection
				anchor="scouts"
				art={ScoutsArt}
				artSide="right"
				accent={LIGHT}
				title={t(
					"landing.scouts.title",
					"Every unique game in one place, with its whole story",
				)}
				lead={t(
					"landing.scouts.lead",
					"Not a pitch from strangers: each project shows its life on GDHub and what game industry experts say about it.",
				)}
				lines={[
					{
						icon: IconLayoutGrid,
						lead: t("landing.scouts.line1.lead", "All in one place:"),
						rest: t(
							"landing.scouts.line1.rest",
							"unique indie games, from the first idea to release.",
						),
					},
					{
						icon: IconActivity,
						lead: t("landing.scouts.line2.lead", "Track development:"),
						rest: t(
							"landing.scouts.line2.rest",
							"stage, team, devlogs and progress every sprint.",
						),
					},
					{
						icon: IconDiscountCheck,
						lead: t("landing.scouts.line3.lead", "Expert verdicts:"),
						rest: t(
							"landing.scouts.line3.rest",
							"what game industry curators said at each checkpoint.",
						),
					},
				]}
				wideStrip={
					storeProjects.length > 0 && (
						<AudienceStrip
							columns={4}
							title={t("landing.scouts.strip", "Games already on Steam")}
						>
							{storeProjects.map((project) => (
								<ProjectStoreCard
									key={project.id}
									projectId={project.id}
									slug={project.slug}
									name={project.name}
									description={project.description}
									genre={project.genre}
									platform={project.platform}
									coverImage={project.coverImage}
									stage={project.workflow.currentStep.name}
									applauseCount={project.applauseCount}
									// Already narrowed to storefronts by `getStoreLinks`.
									storeLinks={project.storeLinks as StorefrontLink[]}
									team={project.team}
									authorName={project.author?.name}
								/>
							))}
						</AudienceStrip>
					)
				}
				action={
					<AudienceAction
						button={
							<Button
								size="large"
								className={buttons.light}
								onClick={() => setRequesting(true)}
								block
							>
								{t("landing.scouts.cta", "Request access")}
							</Button>
						}
					/>
				}
			/>
			{requesting !== null && (
				<ContactModal
					open={requesting}
					onClose={() => setRequesting(false)}
					topic={ContactTopic.ScoutSpace}
				/>
			)}
		</>
	);
}

export function LandingExpertsSection({
	experts,
}: Pick<LandingData, "experts">) {
	const { t } = useTranslate();

	return (
		<AudienceSection
			anchor="experts"
			art={ExpertsArt}
			artSide="left"
			accent={BRAND}
			title={t("landing.experts.title", "Teams need what you already know")}
			lead={t(
				"landing.experts.lead",
				"Game industry professionals answer questions, hold paid calls and, soon, curate checkpoints.",
			)}
			lines={[
				{
					icon: IconMessageCircle,
					lead: t("landing.experts.line1.lead", "Answer questions"),
					rest: t(
						"landing.experts.line1.rest",
						"from teams that need your experience, on your schedule.",
					),
				},
				{
					icon: IconVideo,
					lead: t("landing.experts.line2.lead", "Hold paid calls"),
					rest: t("landing.experts.line2.rest", "at your own price."),
				},
				{
					icon: IconFlag,
					lead: t("landing.experts.line3.lead", "Curate checkpoints:"),
					rest: t(
						"landing.experts.line3.rest",
						"guide a team for 28 days and give the verdict. Coming soon.",
					),
				},
			]}
			wideStrip={
				experts.length > 0 && (
					<AudienceStrip
						columns={4}
						title={t("landing.experts.strip", "Top experts")}
					>
						{experts.map((expert) => (
							<LandingExpertCard key={expert.specialityId} expert={expert} />
						))}
					</AudienceStrip>
				)
			}
			action={
				<Register
					href="/registration?for=mentor"
					note={t("landing.experts.ctaNote", "and turn on Advisor space")}
				/>
			}
		/>
	);
}
