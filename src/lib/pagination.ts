const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

/**
 * Cuts one page out of an already-sorted list, and describes it the way
 * `paginate().withPages()` would.
 *
 * Sorts that cannot be expressed in SQL — a display name, a skill total, an
 * investment estimate — read the filtered set and order it in the handler, so
 * they also have to build the `meta` the client paginates by. That was four
 * hand-written copies of the same seven fields, each with its own chance of an
 * off-by-one, and the last of them reported a `totalCount` straight from the
 * database while paging a list it had already truncated — an endless "load
 * more" onto pages that could only come back empty.
 *
 * So the count comes from the rows themselves: what the client is told exists
 * is what it can actually page to.
 */
/** The seven fields, from a count the caller already has. */
export const pageMeta = (totalCount: number, page: number, limit: number) => {
	const pageCount = Math.max(Math.ceil(totalCount / limit), 1);
	const currentPage = clamp(page, 1, pageCount);

	return {
		currentPage,
		isFirstPage: currentPage === 1,
		isLastPage: currentPage >= pageCount,
		previousPage: currentPage > 1 ? currentPage - 1 : null,
		nextPage: currentPage < pageCount ? currentPage + 1 : null,
		pageCount,
		totalCount,
	};
};

export type PageMeta = ReturnType<typeof pageMeta>;

export const paginateInMemory = <T>(rows: T[], page: number, limit: number) => {
	const meta = pageMeta(rows.length, page, limit);
	const start = (meta.currentPage - 1) * limit;

	return { rows: rows.slice(start, start + limit), meta };
};
