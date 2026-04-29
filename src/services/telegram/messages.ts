import type { OutputData } from "@editorjs/editorjs";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import weekday from "dayjs/plugin/weekday";
import { getEditorjsShortContent } from "@/helpers/content";
import {
	escapeTelegramHtml,
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

export const newProjectReportsMessageRu = (
	reports: (prismaClient.ProjectReport & {
		project: { name: string; slug: string };
	})[],
) => {
	let message = "<b>Новое на проектах сообщества</b>";

	reports.forEach((report) => {
		const content = report.contentEditor
			? htmlFragmentToTelegramPlainText(
					getEditorjsShortContent(
						report.contentEditor as unknown as OutputData,
						150,
					),
				)
			: getCleanTextContent(report.content);

		message += `\n\n<b>Проект ${escapeTelegramHtml(report.project.name)}</b>\n`;
		message += `${content}`;
		message += `\n\n<a href="https://gdhub.io/devlog/${report.id}">Читать</a>\n`;
	});

	return message;
};

export const newProjectReportsMessageEn = (
	reports: (prismaClient.ProjectReport & {
		project: { name: string; slug: string };
	})[],
) => {
	let message = "<b>New on games projects</b>";

	reports.forEach((report) => {
		const content = report.contentEditor
			? htmlFragmentToTelegramPlainText(
					getEditorjsShortContent(
						report.contentEditor as unknown as OutputData,
						150,
					),
				)
			: getCleanTextContent(report.content);

		message += `\n\n<b>Project ${escapeTelegramHtml(report.project.name)}</b>\n`;
		message += `${content}`;
		message += `\n\n<a href="https://gdhub.io/devlog/${report.id}">Read more</a>\n`;
	});

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

export const newVacanciesMessageRu = (projectWithVacancies: any[]) => {
	let message = "🔥 <b>Новые вакансии на проекты сообщества</b>";

	projectWithVacancies.forEach((project) => {
		const vacancyList = project.team.vacancies.map((v: any) => ({
			name: v.title,
			id: v.id,
		})) as {
			name: string;
			id: string;
		}[];

		message += `\n\n<b>Проект ${project.name}</b>\n`;
		message += vacancyList
			.map(
				({ name, id }) =>
					`▶ <b><a href="https://gdhub.io/job/${id}">${name}</a></b>`,
			)
			.join("\n");
	});

	return message;
};

export const newVacanciesMessageEn = (projectWithVacancies: any[]) => {
	let message = "🔥 <b>New vacancies for indie game projects</b>";

	projectWithVacancies.forEach((project) => {
		const vacancyList = project.team.vacancies.map((v: any) => ({
			name: v.title,
			id: v.id,
		})) as {
			name: string;
			id: string;
		}[];

		message += `\n\n<b>Project ${project.name}</b>\n`;
		message += vacancyList
			.map(
				({ name, id }) =>
					`▶ <b><a href="https://gdhub.io/job/${id}">${name}</a></b>`,
			)
			.join("\n");
	});

	return message;
};
