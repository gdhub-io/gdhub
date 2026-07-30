import type { OutputData } from "@editorjs/editorjs";
import type { BlogPost, Project, ProjectReport } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import weekday from "dayjs/plugin/weekday";
import {
	getCleanTextContent as cleanTextContent,
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import {
	escapeTelegramHtml,
	htmlFragmentToPlainText,
	htmlFragmentToTelegramPlainText,
} from "@/helpers/telegramHtml";

dayjs.extend(localizedFormat);
dayjs.extend(localeData);
dayjs.extend(relativeTime);
dayjs.extend(weekday);
dayjs.locale((process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as string) || "en");

const getCleanTextContent = (content: string) => {
	// Удаляем markdown изображения
	const withoutMarkdownImages = content.replace(/!\[.*?\]\(.*?\)/g, "");
	// Удаляем HTML изображения
	const withoutHtmlImages = withoutMarkdownImages.replace(/<img[^>]*>/g, "");
	// Удаляем все HTML теги
	const withoutHtml = withoutHtmlImages.replace(/<[^>]*>/g, "");
	// Удаляем markdown синтаксис
	const withoutMarkdown = withoutHtml
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // ссылки [text](url) -> text
		.replace(/[*_~`]+/g, "") // жирный, курсив, зачеркнутый текст и код
		.replace(/#{1,6}\s/g, "") // заголовки
		.replace(/^\s*[-+*]\s/gm, "") // списки
		.replace(/^\s*\d+\.\s/gm, "") // нумерованные списки
		.replace(/\n\s*>\s*/g, " ") // цитаты
		.replace(/\n\s*\|\s*([^|]+\s*\|)+/g, " "); // таблицы
	// Удаляем лишние пробелы и переносы строк
	const cleanText = withoutMarkdown.replace(/\s+/g, " ").trim();
	return cleanText.slice(0, 250);
};

type ProjectReportForMessage = ProjectReport & {
	project: { name: string; slug: string };
};

const projectReportShortContent = (report: ProjectReportForMessage) =>
	report.contentEditor
		? htmlFragmentToTelegramPlainText(
				getEditorjsShortContent(
					report.contentEditor as unknown as OutputData,
					150,
				),
			)
		: getCleanTextContent(report.content);

/** One devlog — one post. */
export const newProjectReportsMessageRu = (report: ProjectReportForMessage) => {
	let message = `<b>Новое на проекте ${escapeTelegramHtml(report.project.name)}</b>\n\n`;
	message += projectReportShortContent(report);
	message += `\n\n<a href="https://gdhub.io/devlog/${report.id}">Читать</a>`;

	return message;
};

/** One devlog — one post. */
export const newProjectReportsMessageEn = (report: ProjectReportForMessage) => {
	let message = `<b>New on project ${escapeTelegramHtml(report.project.name)}</b>\n\n`;
	message += projectReportShortContent(report);
	message += `\n\n<a href="https://gdhub.io/devlog/${report.id}">Read more</a>`;

	return message;
};

export const newSpecialitiesMessageRu = (specialities: any[]) => {
	let message = `<b>Новые участники сообщества</b>\n\nК сообществу присоединилось <b>+${specialities.length} участника</b> имеющие такие специальности, как:\n- `;
	message += specialities
		.map(
			(r) =>
				`${r.name} (${r.level})${r.specialization ? `\n${r.specialization}` : ""}`,
		)
		.join(";\n- ");
	message += "\n\nДобро пожаловать в наш хаб!";

	return message;
};

export const newSpecialitiesMessageEn = (specialities: any[]) => {
	let message = `<b>New members</b>\n\n<b>+${specialities.length} members</b> have joined the community with specialties such as:\n- `;
	message += specialities
		.map(
			(r) =>
				`${r.name} (${r.level})${r.specialization ? `\n${r.specialization}` : ""}`,
		)
		.join(";\n- ");
	message += "\n\nWelcome to our hub!";

	return message;
};

type CooperationType = "paid" | "equity" | "experience";

/** Classify a vacancy by its cooperation terms (paid takes precedence over equity). */
const cooperationType = (v: {
	offeredAmount?: number | null;
	offeredRateType?: string | null;
	promisePercentage?: number | null;
}): CooperationType => {
	if (v.offeredAmount != null && v.offeredRateType != null) return "paid";
	if (v.promisePercentage) return "equity";
	return "experience";
};

const RATE_SUFFIX_RU: Record<string, string> = {
	Hourly: "/ч",
	OneTime: "разово",
	Monthly: "/мес",
};

const RATE_SUFFIX_EN: Record<string, string> = {
	Hourly: "/ hr",
	OneTime: "one-time",
	Monthly: "/ mo",
};

const cooperationLabelRu = (v: any): string => {
	switch (cooperationType(v)) {
		case "paid":
			return `💰 €${Math.round((v.offeredAmount ?? 0) / 100).toLocaleString()} ${RATE_SUFFIX_RU[v.offeredRateType] ?? ""}`.trim();
		case "equity":
			return `🤝 Доля ${v.promisePercentage?.toFixed(1)}%`;
		default:
			return "🎓 За опыт";
	}
};

const cooperationLabelEn = (v: any): string => {
	switch (cooperationType(v)) {
		case "paid":
			return `💰 €${Math.round((v.offeredAmount ?? 0) / 100).toLocaleString()} ${RATE_SUFFIX_EN[v.offeredRateType] ?? ""}`.trim();
		case "equity":
			return `🤝 Equity ${v.promisePercentage?.toFixed(1)}%`;
		default:
			return "🎓 For experience";
	}
};

/** One project — one post, listing all of that project's new vacancies. */
export const newVacanciesMessageRu = (project: any) => {
	let message = `🔥 <b>Новые вакансии на проекте ${escapeTelegramHtml(project.name)}</b>\n\n`;
	message += project.team.vacancies
		.map(
			(v: any) =>
				`▶ <b><a href="https://gdhub.io/job/${v.id}">${escapeTelegramHtml(v.title)}</a></b> — ${cooperationLabelRu(v)}`,
		)
		.join("\n");

	return message;
};

/** One project — one post, listing all of that project's new vacancies. */
export const newVacanciesMessageEn = (project: any) => {
	let message = `🔥 <b>New vacancies on project ${escapeTelegramHtml(project.name)}</b>\n\n`;
	message += project.team.vacancies
		.map(
			(v: any) =>
				`▶ <b><a href="https://gdhub.io/job/${v.id}">${escapeTelegramHtml(v.title)}</a></b> — ${cooperationLabelEn(v)}`,
		)
		.join("\n");

	return message;
};

// Discord Markdown variant (no HTML). Links are wrapped in <> to suppress
// per-link preview embeds, which would otherwise duplicate the site description.
export const newVacanciesMessageDiscord = (project: any) => {
	let message = `🔥 **New vacancies on project ${project.name}**\n\n`;
	message += project.team.vacancies
		.map(
			(v: any) =>
				`▶ **${v.title}** — ${cooperationLabelEn(v)}\n<https://gdhub.io/job/${v.id}>`,
		)
		.join("\n");

	return message;
};

// Plain-text variant for LinkedIn (no HTML; URLs are auto-linked by LinkedIn).
export const newVacanciesMessageLinkedIn = (project: any) => {
	let message = `🔥 New vacancies on project ${project.name}`;

	project.team.vacancies.forEach((v: any) => {
		message += `\n▶ ${v.title} — ${cooperationLabelEn(v)}\nhttps://gdhub.io/job/${v.id}`;
	});

	return message;
};

export type DevlogPostForMessage = Pick<
	ProjectReport,
	"id" | "content" | "contentEditor"
> & {
	project: Pick<Project, "name" | "coverImage">;
};

/** Teaser length: enough to show what the update is about, short enough to keep
 * the click worthwhile. Fits a Telegram photo caption (1024) with room to spare. */
const DEVLOG_TEASER_LENGTH = 300;

const devlogUrl = (post: DevlogPostForMessage) =>
	`https://gdhub.io/devlog/${post.id}`;

/** Cut at the last sentence/word boundary so the teaser never breaks mid-word. */
const trimToWord = (text: string, maxLength: number) => {
	if (text.length <= maxLength) return text;

	const cut = text.slice(0, maxLength);
	const lastSpace = cut.lastIndexOf(" ");

	return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:—-]+$/, "")}…`;
};

const devlogTeaser = (post: DevlogPostForMessage) => {
	const raw = post.contentEditor
		? htmlFragmentToPlainText(
				getEditorjsShortContent(
					post.contentEditor as unknown as OutputData,
					DEVLOG_TEASER_LENGTH * 2,
				),
			)
		: cleanTextContent(post.content, DEVLOG_TEASER_LENGTH * 2);

	return trimToWord(raw.replace(/\s+/g, " ").trim(), DEVLOG_TEASER_LENGTH);
};

/** Branded OG card for a devlog: project name over the devlog's first image. */
export const devlogOgImage = (post: DevlogPostForMessage) => {
	const base = process.env.NEXT_PUBLIC_APP_URL || "https://gdhub.io";
	const cover =
		getEditorjsPageCover(post.contentEditor as unknown as OutputData) ||
		getPageCover({ content: post.content }) ||
		post.project.coverImage ||
		undefined;

	const params = new URLSearchParams({
		t: post.project.name,
		u: "gdhub.io/devlog",
	});
	if (cover) params.set("img", cover);

	return `${base}/api/og-blog?${params.toString()}`;
};

// Telegram HTML variant (news channels).
export const devlogPostMessageTelegram = (post: DevlogPostForMessage) => {
	let message = `🚀 <b>Update on project ${escapeTelegramHtml(post.project.name)}</b>`;

	const teaser = devlogTeaser(post);
	if (teaser) message += `\n\n${escapeTelegramHtml(teaser)}`;

	message += `\n\n<a href="${devlogUrl(post)}">Read the devlog</a>`;
	message += `\n\n<i>P.S. Like it? Hit 👏 on the devlog — applause counts toward the project's rating.</i>`;

	return message;
};

// Discord Markdown variant (no HTML).
export const devlogPostMessageDiscord = (post: DevlogPostForMessage) => {
	let message = `🚀 **Update on project ${post.project.name}**`;

	const teaser = devlogTeaser(post);
	if (teaser) message += `\n\n${teaser}`;

	message += `\n\n${devlogUrl(post)}`;
	message += `\n\n*P.S. Like it? Hit 👏 on the devlog — applause counts toward the project's rating.*`;

	return message;
};

// Plain-text variant for LinkedIn (no markup; URLs are auto-linked by LinkedIn).
export const devlogPostMessageLinkedIn = (post: DevlogPostForMessage) => {
	let message = `🚀 Update on project ${post.project.name}`;

	const teaser = devlogTeaser(post);
	if (teaser) message += `\n\n${teaser}`;

	message += `\n\n${devlogUrl(post)}`;
	message += `\n\nP.S. Like it? Hit 👏 on the devlog — applause counts toward the project's rating.`;

	return message;
};

type BlogPostForMessage = Pick<
	BlogPost,
	"title" | "content" | "slug" | "image"
>;

const blogPostUrl = (post: BlogPostForMessage) =>
	`https://gdhub.io/blog/${post.slug}`;

const blogPostShortText = (post: BlogPostForMessage) =>
	getEditorjsShortContent(post.content as unknown as OutputData, 400);

/**
 * Branded OG image for a blog post announcement: the post title + GDHub logo
 * over the post's first image (when present). Generated by /api/og-blog.
 */
export const blogPostOgImage = (post: BlogPostForMessage) => {
	const base = process.env.NEXT_PUBLIC_APP_URL || "https://gdhub.io";
	const cover =
		post.image ||
		getEditorjsPageCover(post.content as unknown as OutputData) ||
		undefined;

	const params = new URLSearchParams({ t: post.title });
	if (cover) params.set("img", cover);

	return `${base}/api/og-blog?${params.toString()}`;
};

// Telegram HTML variant (news thread).
export const blogPostMessageTelegram = (post: BlogPostForMessage) => {
	const short = htmlFragmentToTelegramPlainText(blogPostShortText(post));

	let message = `📝 <b>${escapeTelegramHtml(post.title)}</b>`;
	if (short) message += `\n\n${short}`;
	message += `\n\n<a href="${blogPostUrl(post)}">Read more</a>`;

	return message;
};

// Discord supports Markdown; keep it plain with a bold title and a link.
export const blogPostMessageDiscord = (post: BlogPostForMessage) => {
	const short = htmlFragmentToPlainText(blogPostShortText(post));

	let message = `📝 **${post.title}**`;
	if (short) message += `\n\n${short}`;
	message += `\n\n${blogPostUrl(post)}`;

	return message;
};

// Plain-text variant for LinkedIn (no HTML; URLs are auto-linked by LinkedIn).
export const blogPostMessageLinkedIn = (post: BlogPostForMessage) => {
	const short = htmlFragmentToPlainText(blogPostShortText(post));

	let message = `📝 ${post.title}`;
	if (short) message += `\n\n${short}`;
	message += `\n\n${blogPostUrl(post)}`;

	return message;
};
