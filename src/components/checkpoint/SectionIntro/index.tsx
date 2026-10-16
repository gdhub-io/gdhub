import styles from "./style.module.scss";

export function SectionIntro({
	eyebrow,
	headline,
	lead,
	layout = "stacked",
	className,
}: {
	eyebrow: string;
	headline: string;
	lead?: string;
	/** `split` moves the lead into a second column beside the headline (≥992). */
	layout?: "stacked" | "split";
	className?: string;
}) {
	return (
		<div
			className={[styles.intro, styles[layout], className]
				.filter(Boolean)
				.join(" ")}
		>
			<div className={styles.copy}>
				<p className={styles.eyebrow}>{eyebrow}</p>
				<h2 className={styles.headline}>{headline}</h2>
			</div>
			{lead ? <p className={styles.lead}>{lead}</p> : null}
		</div>
	);
}
