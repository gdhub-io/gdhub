"use client";

import parse from "html-react-parser";
import { useMemo } from "react";
import { LinkItUrl } from "react-linkify-it";
import { sanitizeHtml } from "@/lib/content/sanitize-html";

// Paragraphs are built before sanitizing: splitting sanitized HTML could cut an attribute open.
const toSafeHtml = (text: string) =>
	sanitizeHtml(
		text
			.split("\n\n")
			.map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
			.join(""),
	);

export const TextWithLineBreak = ({ text }: { text?: string | null }) => {
	const html = useMemo(() => (text ? toSafeHtml(text) : ""), [text]);

	if (!html) return null;

	return <LinkItUrl>{parse(html)}</LinkItUrl>;
};
