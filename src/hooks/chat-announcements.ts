"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import type { ChatMessagePayload } from "@/helpers/chat-media";

/** Posts to Announcements as the GDHub account; the post arrives through sync. */
export const useAnnouncementPost = () =>
	useMutation({
		mutationFn: (post: ChatMessagePayload) =>
			axios.post("/api/chat/announcements", post).then(() => undefined),
	});

const eventPath = (eventId: string) =>
	`/api/chat/announcements/${encodeURIComponent(eventId)}`;

/** Edits a GDHub post in place: new text, or a picture with its caption. */
export const useAnnouncementEdit = () =>
	useMutation({
		mutationFn: ({
			eventId,
			change,
		}: {
			eventId: string;
			change: ChatMessagePayload;
		}) => axios.patch(eventPath(eventId), change).then(() => undefined),
	});

/** Removes a GDHub post for everyone. */
export const useAnnouncementDelete = () =>
	useMutation({
		mutationFn: (eventId: string) =>
			axios.delete(eventPath(eventId)).then(() => undefined),
	});
