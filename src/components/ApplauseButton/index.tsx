"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import axios from "axios";
import { useSession } from "next-auth/react";
import type React from "react";
import { useState } from "react";
import { ApplauseIcon } from "@/components/ui";
import { formatCompactCount } from "@/helpers/format";
import styles from "./style.module.scss";

/** What is being applauded. Each kind has its own `.../applause` route. */
export type ApplauseSubject = {
	kind: "devlog" | "project";
	id: string;
};

type ApplauseState = {
	count: number;
	hasApplauded: boolean;
};

export type ApplauseButtonProps = {
	/** Subject to applaud. Omit to render a read-only counter. */
	subject?: ApplauseSubject;
	/** Count already known from the page payload — shown before the live one arrives. */
	count?: number;
	size?: "default" | "large";
	/** `plain` — bare icon and number; `chip` — pill, for badges over a cover image. */
	variant?: "plain" | "chip";
	/** Render the number next to the icon. */
	showCount?: boolean;
	className?: string;
};

const endpoint = ({ kind, id }: ApplauseSubject) =>
	kind === "devlog"
		? `/api/devlog/${id}/applause`
		: `/api/project/${id}/applause`;

/**
 * Applause — the raised hand and its counter, in one place.
 *
 * The icon is painted from the first frame: nothing about it depends on the
 * network, so it never waits behind a spinner. Only the number can be unknown,
 * and while it is, its slot holds a faint placeholder instead of collapsing.
 */
export function ApplauseButton({
	subject,
	count,
	size = "default",
	variant = "plain",
	showCount = true,
	className,
}: ApplauseButtonProps) {
	const { t, getLanguage } = useTolgee();
	const { status } = useSession();
	const queryClient = useQueryClient();
	const isAuthenticated = status === "authenticated";
	const [playToken, setPlayToken] = useState(0);

	const queryKey = ["applause", subject?.kind, subject?.id];
	// Anonymous readers cannot applaud, so the page's own count is all they
	// need — no request per card just to learn they have not applauded.
	const shouldFetch = !!subject && isAuthenticated;

	const { data, isPending } = useQuery({
		queryKey,
		queryFn: async () => {
			if (!subject) throw new Error("No applause subject");
			const { data } = await axios.get<ApplauseState>(endpoint(subject));
			return data;
		},
		enabled: shouldFetch,
		refetchOnWindowFocus: false,
	});

	const { mutate, isPending: isToggling } = useMutation({
		mutationFn: async (next: boolean) => {
			if (!subject) throw new Error("No applause subject");
			const { data } = await axios.request<ApplauseState>({
				url: endpoint(subject),
				method: next ? "POST" : "DELETE",
			});
			return data;
		},
		onMutate: async (next) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData<ApplauseState>(queryKey);
			const base = previous ?? { count: count ?? 0, hasApplauded: false };
			queryClient.setQueryData<ApplauseState>(queryKey, {
				hasApplauded: next,
				count: Math.max(0, base.count + (next ? 1 : -1)),
			});
			return { previous };
		},
		onError: (_error, _next, context) => {
			queryClient.setQueryData(queryKey, context?.previous);
		},
		onSuccess: (state) => {
			queryClient.setQueryData(queryKey, state);
		},
	});

	const hasApplauded = data?.hasApplauded ?? false;
	// The live count wins once it arrives; until then the payload's value, if any.
	const displayCount = data?.count ?? count;
	const isCountUnknown = displayCount === undefined && shouldFetch && isPending;
	const isInteractive = shouldFetch;

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isInteractive || isToggling) return;
		if (!hasApplauded) setPlayToken((value) => value + 1);
		mutate(!hasApplauded);
	};

	// The box comes from CSS: `large` is smaller on a phone than on a desktop,
	// and the count follows it, so the pair keeps its proportion at both sizes.
	const glyph = (
		<ApplauseIcon
			size="var(--applause-icon)"
			active={hasApplauded}
			playToken={playToken}
		/>
	);

	const rootClass = [styles.applause, styles[variant], styles[size], className]
		.filter(Boolean)
		.join(" ");

	return (
		<span className={rootClass}>
			{/* Only the glyph is the target — the count reports, it does not act. */}
			{isInteractive ? (
				<button
					type="button"
					className={`${styles.iconWrap} ${styles.interactive}`}
					data-active={hasApplauded || undefined}
					onClick={handleClick}
					aria-pressed={hasApplauded}
					aria-label={t("applause.action", "Applaud")}
				>
					{glyph}
				</button>
			) : (
				<span
					className={styles.iconWrap}
					data-active={hasApplauded || undefined}
				>
					{glyph}
				</span>
			)}
			{showCount &&
				(isCountUnknown ? (
					<span className={styles.countSkeleton} aria-hidden="true" />
				) : (
					<span className={styles.count}>
						{formatCompactCount(displayCount ?? 0, getLanguage())}
					</span>
				))}
		</span>
	);
}

export default ApplauseButton;
