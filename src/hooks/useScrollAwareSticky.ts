import { type RefObject, useEffect } from "react";

type Options = {
	/** Gap kept between the pinned edge and the scroll area. */
	offset?: number;
	/** Disable without unmounting — e.g. below the sidebar breakpoint. */
	enabled?: boolean;
};

const findScrollParent = (node: HTMLElement | null): HTMLElement | null => {
	let el = node?.parentElement ?? null;
	while (el) {
		const overflowY = getComputedStyle(el).overflowY;
		if (overflowY === "auto" || overflowY === "scroll") return el;
		el = el.parentElement;
	}
	return null;
};

/**
 * Pins a column that is taller than the viewport, in whichever direction you are
 * reading.
 *
 * Plain `position: sticky` can only hold one edge: pin the top and the bottom of
 * a tall column is never reachable; pin the bottom and it only holds while
 * scrolling up. This tracks the direction instead — scrolling down lets the
 * column ride along until its last row meets the bottom edge and then holds it
 * there; scrolling back up releases it until its first row meets the top.
 *
 * It drives the `top` of a `position: sticky` element rather than switching to
 * `fixed`, so the column keeps its place in the layout and never jumps.
 */
export function useScrollAwareSticky(
	ref: RefObject<HTMLElement | null>,
	{ offset = 0, enabled = true }: Options = {},
) {
	useEffect(() => {
		const node = ref.current;
		if (!node || !enabled) return;

		const scroller = findScrollParent(node);
		const viewportOf = () =>
			scroller ? scroller.clientHeight : window.innerHeight;
		const scrollTopOf = () => (scroller ? scroller.scrollTop : window.scrollY);

		let lastScroll = scrollTopOf();
		// How far the column is currently pulled up past its resting offset.
		let pulled = 0;
		let frame = 0;

		const apply = () => {
			frame = 0;
			const overflow = node.offsetHeight + offset * 2 - viewportOf();

			// Short enough to fit: nothing to reveal, just pin under the header.
			if (overflow <= 0) {
				pulled = 0;
				node.style.top = `${offset}px`;
				lastScroll = scrollTopOf();
				return;
			}

			const current = scrollTopOf();
			const delta = current - lastScroll;
			lastScroll = current;

			pulled = Math.min(Math.max(pulled + delta, 0), overflow);
			node.style.top = `${offset - pulled}px`;
		};

		const onScroll = () => {
			if (frame) return;
			frame = requestAnimationFrame(apply);
		};

		apply();
		const target: HTMLElement | Window = scroller ?? window;
		target.addEventListener("scroll", onScroll, { passive: true });
		const resizeObserver = new ResizeObserver(apply);
		resizeObserver.observe(node);
		if (scroller) resizeObserver.observe(scroller);

		return () => {
			target.removeEventListener("scroll", onScroll);
			resizeObserver.disconnect();
			if (frame) cancelAnimationFrame(frame);
			node.style.removeProperty("top");
		};
	}, [ref, offset, enabled]);
}
