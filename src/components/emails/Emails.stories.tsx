import type { Meta, StoryObj } from "@storybook/nextjs";
import { Button, Card, Flex, Typography } from "antd";
import {
	vacancyArchived,
	vacancyArchiveWarning,
} from "@/services/vacancyExpiryMessages";

// The mails are laid out in Novu, not in this repo: these stories reproduce
// their text so it can be read and reviewed in one place. Vacancy texts come
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

// `default-message` renders the message and one fixed button to `redirectUrl`.
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
			button="Go!"
		/>
	);
}

/** Sent to a project author after three months without a devlog post. */
export const DevlogReminder: StoryObj = {
	render: () => (
		<Email
			workflow="share-project-news (en)"
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

/** The same reminder for an author whose language is Russian. */
export const DevlogReminderRu: StoryObj = {
	render: () => (
		<Email
			workflow="share-project-news (ru)"
			subject="Поделитесь новостями о вашей игре Moonlit Harbor"
			paragraphs={[
				"Привет!",
				"Мы заметили, что вы давно не публиковали обновления по своему игровому проекту Moonlit Harbor . Возможно, у вас сейчас как раз идёт активная работа — если так, будет здорово, если вы поделитесь новостями!",
				"Регулярные обновления помогают:\n– напомнить о проекте подписчикам и заинтересовать новых участников,\n– получать обратную связь от сообщества,\n– показывать прогресс потенциальным инвесторам и команде.",
				"Даже короткий пост — это уже шаг вперёд. Расскажите, над чем работаете сейчас, какие этапы прошли или планируете пройти дальше.\nЕсли пока всё в паузе — это тоже нормально, и об этом можно написать.",
			]}
			button="Написать в дневник разработки"
			afterButton={[
				'Ждём вашего апдейта!\nЕсли нужна помощь — мы рядом, пишите в наш чат сообщества или ищите нужного вам эксперта в нашем приложении "Менторы из геймдев".',
				"С уважением,\nКоманда Game Developers Hub",
			]}
		/>
	),
};

/** Sent on a listing's last day, when candidates are still waiting. */
export const VacancyArchiveWarning: StoryObj = {
	render: () => (
		<DefaultMessage {...vacancyArchiveWarning("Senior 2D Artist", 2)} />
	),
};

/** The same warning for a listing nobody is waiting on. */
export const VacancyArchiveWarningNoCandidates: StoryObj = {
	render: () => (
		<DefaultMessage {...vacancyArchiveWarning("Senior 2D Artist", 0)} />
	),
};

/** Sent once the listing is closed — the only mail a listing of three days or less gets. */
export const VacancyArchived: StoryObj = {
	render: () => <DefaultMessage {...vacancyArchived("Senior 2D Artist")} />,
};
