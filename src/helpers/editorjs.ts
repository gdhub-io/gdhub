import isEqual from "lodash/isEqual";

type Blocks = { type: string; data: unknown }[];

/** An Editor.js text with no blocks is no text: the one definition of "empty". */
export const hasBlocks = (
	content: { blocks: unknown[] } | null | undefined,
): content is PrismaJson.EditorJsContent => !!content?.blocks.length;

/** What a text's blocks say, without the ids Editor.js adds on load. */
export const blocksOf = (blocks: Blocks) =>
	blocks.map(({ type, data }) => ({ type, data }));

/**
 * Whether two texts say the same — key order aside, which the database keeps
 * in its own — so that opening a text is never taken for editing it.
 */
export const sameBlocks = (a: Blocks, b: Blocks) =>
	isEqual(blocksOf(a), blocksOf(b));
