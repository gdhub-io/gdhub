import {
	IconArticle,
	IconBriefcase,
	IconCalendarEvent,
	IconNotebook,
	IconRocket,
	IconSchool,
	IconUserStar,
	type Icon as TablerIcon,
} from "@tabler/icons-react";
import {
	VIEW_REPORT_SUBJECTS,
	type ViewReportSubject,
} from "@/types/admin-views";

export type ViewSubjectMeta = {
	subject: ViewReportSubject;
	/** Tolgee key; `label` is its English default. */
	labelKey: string;
	label: string;
	icon: TablerIcon;
	/** The series colour, as a custom property — never a hex at the call site. */
	color: string;
};

/**
 * Colour is the same kind of fact as the icon, so it lives here with it. The
 * slot is assigned explicitly rather than derived from the array position: a
 * type keeps its colour whatever its rank on the day.
 */
const META: Record<ViewReportSubject, Omit<ViewSubjectMeta, "subject">> = {
	ProjectReport: {
		labelKey: "admin.views.type.devlogs",
		label: "Devlogs",
		icon: IconNotebook,
		color: "var(--gd-chart-series-1)",
	},
	BlogPost: {
		labelKey: "admin.views.type.blog",
		label: "Blog posts",
		icon: IconArticle,
		color: "var(--gd-chart-series-2)",
	},
	CoursePage: {
		labelKey: "admin.views.type.courses",
		label: "Courses",
		icon: IconSchool,
		color: "var(--gd-chart-series-3)",
	},
	EventPage: {
		labelKey: "admin.views.type.events",
		label: "Events",
		icon: IconCalendarEvent,
		color: "var(--gd-chart-series-4)",
	},
	ExpertPage: {
		labelKey: "admin.views.type.experts",
		label: "Experts",
		icon: IconUserStar,
		color: "var(--gd-chart-series-5)",
	},
	VacancyPage: {
		labelKey: "admin.views.type.vacancies",
		label: "Vacancies",
		icon: IconBriefcase,
		color: "var(--gd-chart-series-6)",
	},
	ProjectPage: {
		labelKey: "admin.views.type.project",
		label: "Projects",
		icon: IconRocket,
		color: "var(--gd-chart-series-7)",
	},
};

/**
 * The seven types, once.
 *
 * Cards, legend, tooltip, end labels and the type selector all map over this
 * array, which is why the order is taken from `VIEW_REPORT_SUBJECTS` rather than
 * restated here: it is the slot order the series palette was validated in.
 *
 * The public link is deliberately absent. The server sends `href` per row (and
 * `null` once a page has stopped being public), so a builder here would be a
 * second opinion on the same question.
 */
export const VIEW_SUBJECTS: ViewSubjectMeta[] = VIEW_REPORT_SUBJECTS.map(
	(subject) => ({ subject, ...META[subject] }),
);

const BY_SUBJECT = Object.fromEntries(
	VIEW_SUBJECTS.map((meta) => [meta.subject, meta]),
) as Record<ViewReportSubject, ViewSubjectMeta>;

export const viewSubjectMeta = (subject: ViewReportSubject): ViewSubjectMeta =>
	BY_SUBJECT[subject];
