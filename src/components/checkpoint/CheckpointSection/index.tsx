import type { ReactNode } from "react";
import { InverseBand } from "@/components/ui/InverseBand";
import styles from "./style.module.scss";

/** A dark band is an `InverseBand`, not a fill: nested antd needs the inverse roles. */
export function CheckpointSection({
	tone,
	anchor,
	className,
	children,
}: {
	tone: "dark" | "surface" | "sunken";
	/** Page anchor. Not named `id`: biome forbids a literal one in JSX. */
	anchor?: string;
	className?: string;
	children: ReactNode;
}) {
	const section = (
		<section
			id={anchor}
			className={[styles.section, styles[tone], className]
				.filter(Boolean)
				.join(" ")}
		>
			<div className={styles.container}>{children}</div>
		</section>
	);

	return tone === "dark" ? (
		<InverseBand className={styles.band}>{section}</InverseBand>
	) : (
		section
	);
}
