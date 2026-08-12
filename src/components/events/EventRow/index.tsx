"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Grid } from "antd";
import type React from "react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import styles from "./style.module.scss";

/** Pixels of travel before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 5;

/**
 * A row of cards paged by arrows.
 *
 * Cards are deliberately different widths — each cover keeps its own shape — so
 * a wrapping grid left a ragged edge with holes in it. A row takes any mix, and
 * the arrows move it a screenful at a time rather than asking for a drag.
 *
 * The arrows appear only when there is somewhere to go: none at all when
 * everything fits, and each one hides at its own end of the track.
 */
export function EventRow({ children }: { children: ReactNode }) {
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();
	const trackRef = useRef<HTMLDivElement>(null);

	// Not rendered at all on a phone rather than hidden with CSS: the row is
	// swiped there, and a button that exists only to be display:none is one more
	// thing for a stylesheet to get wrong.
	const showArrows = !!screens.md;
	const [reach, setReach] = useState({ start: false, end: false });

	const measure = useCallback(() => {
		const track = trackRef.current;
		if (!track) return;

		// The bleed is drawn with `padding-inline: calc(50vw - 50%)`, but the same
		// expression cannot be reused for `scroll-padding`: percentages there
		// resolve against the scrollport itself, so the calc collapsed to zero and
		// a snapped card landed against the edge of the screen instead of the
		// page's column. Measuring the gutter is the one reliable way to get it.
		const gutter = track.parentElement
			? track.parentElement.getBoundingClientRect().left -
				track.getBoundingClientRect().left
			: 0;
		track.style.scrollPaddingInlineStart = `${Math.max(gutter, 0)}px`;

		// A pixel of tolerance: fractional layout widths mean scrollLeft rarely
		// lands exactly on the end, and an arrow that never turns off is worse
		// than one that turns off a pixel early.
		const max = track.scrollWidth - track.clientWidth;
		setReach({
			start: track.scrollLeft > 1,
			end: track.scrollLeft < max - 1,
		});
	}, []);

	useEffect(() => {
		const track = trackRef.current;
		if (!track) return;

		measure();
		track.addEventListener("scroll", measure, { passive: true });

		// The row also changes when the window resizes or the cards load their
		// covers, so watch the element rather than just the window.
		const observer = new ResizeObserver(measure);
		observer.observe(track);
		for (const child of track.children) observer.observe(child);

		return () => {
			track.removeEventListener("scroll", measure);
			observer.disconnect();
		};
	}, [measure]);

	/**
	 * Drag with the mouse.
	 *
	 * Touch already pans the row natively; a mouse has no such gesture, so the
	 * pointer moves the track by hand and the snap settles it on release. The
	 * drag only starts after a few pixels, and the click that follows one is
	 * swallowed — otherwise every drag that began on a card would open it.
	 */
	const drag = useRef({
		active: false,
		startX: 0,
		startScroll: 0,
		moved: false,
	});

	const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		const track = trackRef.current;
		if (!track || event.pointerType !== "mouse" || event.button !== 0) return;

		drag.current = {
			active: true,
			startX: event.clientX,
			startScroll: track.scrollLeft,
			moved: false,
		};
		// Snapping fights every assignment to scrollLeft, and smooth behaviour
		// animates each one; both come back on release, which is what makes the
		// row settle on a card.
		track.style.scrollSnapType = "none";
		track.style.scrollBehavior = "auto";
	};

	const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const track = trackRef.current;
		if (!track || !drag.current.active) return;

		const dx = event.clientX - drag.current.startX;
		if (!drag.current.moved) {
			if (Math.abs(dx) < DRAG_THRESHOLD) return;
			drag.current.moved = true;
			track.setPointerCapture(event.pointerId);
		}

		track.scrollLeft = drag.current.startScroll - dx;
	};

	const endDrag = () => {
		const track = trackRef.current;
		drag.current.active = false;
		if (!track) return;

		track.style.scrollSnapType = "";
		track.style.scrollBehavior = "";
	};

	const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
		if (!drag.current.moved) return;

		event.preventDefault();
		event.stopPropagation();
		drag.current.moved = false;
	};

	const page = (direction: 1 | -1) => {
		const track = trackRef.current;
		if (!track) return;

		// A screenful less one card, so the card at the edge stays in view and
		// gives the eye something to carry across the jump.
		const step = Math.max(track.clientWidth - 120, track.clientWidth * 0.6);
		track.scrollBy({ left: direction * step, behavior: "smooth" });
	};

	return (
		<div className={styles.row}>
			{showArrows && reach.start && (
				<Button
					shape="circle"
					className={`${styles.arrow} ${styles.prev}`}
					icon={<IconChevronLeft size={18} />}
					aria-label={t("common.previous", "Previous")}
					onClick={() => page(-1)}
				/>
			)}

			{/* biome-ignore lint/a11y/noStaticElementInteractions: the handlers pan
			    a scroll container that is already keyboard- and wheel-scrollable;
			    they add a mouse gesture, not a new control. */}
			<div
				ref={trackRef}
				className={styles.track}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
				onClickCapture={onClickCapture}
				// Cards are links, and a browser answers a press-and-move on a link
				// by starting its own drag-and-drop — which cancels the pointer
				// stream and left the row sitting still.
				onDragStart={(event) => event.preventDefault()}
			>
				{children}
			</div>

			{showArrows && reach.end && (
				<Button
					shape="circle"
					className={`${styles.arrow} ${styles.next}`}
					icon={<IconChevronRight size={18} />}
					aria-label={t("common.next", "Next")}
					onClick={() => page(1)}
				/>
			)}
		</div>
	);
}

export default EventRow;
