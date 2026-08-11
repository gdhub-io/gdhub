"use client";

import type { Event } from "@gdhub-io/gdhub-prisma";
import { useMutation } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { App, Button, Flex } from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { gtmEventTrigger } from "@/helpers/gtm";
import styles from "./style.module.scss";

/**
 * The foot of an event page: the one thing the page is asking for.
 *
 * Both public layouts ended with the same block, mutation and all, so it lives
 * here once. All three states keep the design's footprint — one action, one
 * line under it — instead of swapping in a panel: the page is warm neutral and
 * brand, and a blue info box would be the only blue on it, louder than the
 * button it replaced. Graphite acts, the rest is quiet text.
 */
export function EventRegisterAction({
	event,
	isFinished,
}: {
	event: Event;
	isFinished: boolean;
}) {
	const { t } = useTolgee();
	const { message, modal } = App.useApp();
	const { data: session } = useSession();

	const track = () =>
		gtmEventTrigger("event-register-click", {
			event_category: event.type,
			event_label: event.title,
			event_url: event.url,
			page_url: window.location.href,
		});

	const { mutateAsync: registerToEvent, isPending } = useMutation({
		mutationFn: async () => {
			await axios.post(`/api/user/event/${event.id}/register`);
		},
		onSuccess: () => {
			track();
			modal.success({
				title: t("event.register.success.title", "Registration successful"),
				content: t(
					"event.register.success.description",
					"You have been successfully registered for the event.",
				),
			});
		},
		onError: () => {
			message.error(
				t(
					"event.register.error",
					"Failed to register for the event. Please try again later.",
				),
			);
		},
	});

	if (isFinished) {
		return (
			<Flex vertical gap={4} align="center" className={styles.note}>
				<span className={styles.noteTitle}>
					{t("event.finished.title", "This event has ended")}
				</span>
				<span>
					{t("event.finished.description", "Registration is closed.")}
				</span>
			</Flex>
		);
	}

	// An external sign-up is checked before the session: the platform is not the
	// one taking the registration, so asking the reader to join it first would be
	// a gate that guards nothing.
	if (event.url) {
		return (
			<Flex vertical gap={8} align="center" className={styles.stack}>
				{/* No "Free" here: the price lives on someone else's page, and this
				    button cannot promise what it will say. */}
				<Button
					type="primary"
					size="large"
					className={styles.action}
					href={event.url}
					target="_blank"
					onClick={track}
				>
					{t("event.action.book", "Book Now")}
				</Button>
				<span className={styles.hint}>
					{t(
						"event.action.book.externalHint",
						"Registration happens on the organiser's site.",
					)}
				</span>
			</Flex>
		);
	}

	if (!session?.user) {
		return (
			<Flex vertical gap={8} align="center" className={styles.stack}>
				<Button
					type="primary"
					size="large"
					href="/registration"
					className={styles.action}
				>
					{t("event.signInRequired.action", "Sign in to register")}
				</Button>
				<span className={styles.hint}>
					{t(
						"event.signInRequired.description",
						"Registration is open to platform members.",
					)}
				</span>
			</Flex>
		);
	}

	return (
		<Button
			type="primary"
			size="large"
			className={styles.action}
			loading={isPending}
			onClick={() => registerToEvent()}
		>
			{event.isFree
				? t("event.action.bookFree", "Book Now Free")
				: t("event.action.book", "Book Now")}
		</Button>
	);
}

export default EventRegisterAction;
