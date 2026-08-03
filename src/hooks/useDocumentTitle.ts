"use client";

import { useEffect } from "react";

const SUFFIX = " · GDHub";

/**
 * Sets the browser tab title of a client-rendered page.
 *
 * The space shells are client components whose data arrives after the first
 * render, so `generateMetadata` cannot see it — it runs on the server, before
 * the project or event is known. These pages are `noindex` anyway: the title is
 * for the person scanning their tabs, not for a crawler.
 *
 * Mirrors the `%s · GDHub` template from the root layout, so a space page reads
 * the same as every other page in the app.
 */
export const useDocumentTitle = (title?: string | null): void => {
	useEffect(() => {
		if (!title) return;

		const previous = document.title;
		document.title = title.endsWith(SUFFIX) ? title : title + SUFFIX;

		return () => {
			document.title = previous;
		};
	}, [title]);
};
