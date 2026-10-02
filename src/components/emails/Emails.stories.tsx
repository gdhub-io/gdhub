import type { Meta, StoryObj } from "@storybook/nextjs";
import { Button, Card, Flex, Typography } from "antd";
import {
	candidatesWaiting,
	vacancyArchived,
	vacancyArchiveWarning,
} from "@/services/vacancyExpiryMessages";

// The mails are laid out in Novu, not in this repo: these stories reproduce
// their text so it can be read and reviewed in one place. Open position texts come
// from the code that sends them; the devlog reminder is copied from the
// `share-project-news` workflow (2026-10-02) and has to be re-copied if it is
// edited there.
const meta: Meta = {
	title: "Emails",
	parameters: { layout: "padded", controls: { disable: true } },
};

export default meta;

type EmailProps = {
	workflow: string;
	subject: string;
	paragraphs: string[];
	button: string;
	afterButton?: string[];
};

const paragraph: React.CSSProperties = { whiteSpace: "pre-line" };

function Email({
	workflow,
	subject,
	paragraphs,
	button,
	afterButton = [],
}: EmailProps) {
	return (
		<Card
			style={{ maxWidth: 600 }}
			title={
				<Flex vertical gap={2}>
					<Typography.Text type="secondary">
						Novu workflow: {workflow}
					</Typography.Text>
					<Typography.Text strong>{subject}</Typography.Text>
				</Flex>
			}
		>
			{paragraphs.map((text) => (
				<Typography.Paragraph key={text} style={paragraph}>
					{text}
				</Typography.Paragraph>
			))}
			<Typography.Paragraph>
				<Button type="primary">{button}</Button>
			</Typography.Paragraph>
			{afterButton.map((text) => (
				<Typography.Paragraph key={text} style={paragraph}>
					{text}
				</Typography.Paragraph>
			))}
		</Card>
	);
}

// `default-message` renders the message and one button to `redirectUrl`,
// labelled by `buttonText`.
function DefaultMessage({
	title,
	message,
}: {
	title: string;
	message: string;
}) {
	return (
		<Email
			workflow="default-message"
			subject={title}
			paragraphs={[message]}
			button="Go to open positions"
		/>
	);
}

/** Sent to a project author after three months without a devlog post. */
export const DevlogReminder: StoryObj = {
	render: () => (
		<Email
			workflow="share-project-news"
			subject="Share an update about your game Moonlit Harbor"
			paragraphs={[
				"Hi!",
				"We noticed that it's been a while since you posted any updates about your game Moonlit Harbor. If you've made some progress recently, now is a great time to share it with the community!",
				"Posting regular updates helps you:\n– remind others about your project and attract new supporters,\n– get feedback from fellow developers,\n– show progress to potential investors and team members.",
				"Even a short update can go a long way. Let people know what you're working on, what milestones you've reached, or what your next steps are.",
			]}
			button="Post to your devlog"
			afterButton={[
				"We’re looking forward to hearing from you!",
				"If you need any help — we’re here for you, feel free to reach out in our community chat or find the expert you need in our “Game Dev Mentors” app.",
			]}
		/>
	),
};

/** Sent three days before a listing is archived, when candidates are still waiting. */
export const VacancyArchiveWarning: StoryObj = {
	render: () => (
		<DefaultMessage
			{...vacancyArchiveWarning("Senior 2D Artist", "Moonlit Harbor", 2)}
		/>
	),
};

/** The same warning for a listing nobody is waiting on. */
export const VacancyArchiveWarningNoCandidates: StoryObj = {
	render: () => (
		<DefaultMessage
			{...vacancyArchiveWarning("Senior 2D Artist", "Moonlit Harbor", 0)}
		/>
	),
};

/** Sent when a candidate has waited a week for an answer. */
export const CandidatesWaiting: StoryObj = {
	render: () => (
		<DefaultMessage
			{...candidatesWaiting("Senior 2D Artist", "Moonlit Harbor", 3)}
		/>
	),
};

/** Sent once the listing is closed — the only mail a listing of three days or less gets. */
export const VacancyArchived: StoryObj = {
	render: () => (
		<DefaultMessage
			{...vacancyArchived("Senior 2D Artist", "Moonlit Harbor")}
		/>
	),
};
