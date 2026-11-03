"use client";

import {
	IconArrowRight,
	IconEqualNot,
	IconMinus,
	IconPlus,
} from "@tabler/icons-react";
import { Flex } from "antd";
import type { LocalChange } from "@/services/workflow/diffFromTemplate";
import styles from "./LocalChangeList.module.scss";

const ICONS = {
	added: { Icon: IconPlus, tone: styles.added },
	removed: { Icon: IconMinus, tone: styles.removed },
	moved: { Icon: IconArrowRight, tone: styles.moved },
	own: { Icon: IconEqualNot, tone: styles.moved },
} satisfies Record<LocalChange["kind"], unknown>;

function Icon({ kind }: { kind: LocalChange["kind"] }) {
	const { Icon: Glyph, tone } = ICONS[kind];
	return <Glyph size={14} className={`${styles.icon} ${tone}`} />;
}

/**
 * A list of differences from a template, read the same way everywhere it shows.
 *
 * The editor, the reset preview and the differences dialog all describe the same
 * facts, and a reader who learns the shape in one of them should not have to
 * learn it again in the next.
 */
export function LocalChangeList({ changes }: { changes: LocalChange[] }) {
	return (
		<Flex vertical gap={8}>
			{changes.map((change) => (
				<Flex
					align="flex-start"
					gap={8}
					key={change.text}
					className={styles.change}
				>
					<Icon kind={change.kind} />
					<span>{change.text}</span>
				</Flex>
			))}
		</Flex>
	);
}

export default LocalChangeList;
