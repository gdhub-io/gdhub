import { IconExternalLink, IconMail } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { IconTile } from "@/components/ui";
import styles from "./style.module.scss";

export type MagicLinkSentProps = {
	title: string;
	/** Sentence introducing the address, e.g. "We have sent a sign-in link to". */
	lead: string;
	email?: string;
	/** What the user has to do next. The one line that has to be unmissable. */
	hint: string;
	children?: ReactNode;
};

/**
 * The state both /signin and /registration end in once the mail is away.
 *
 * It carries four levels on purpose — mark, title, the address on its own line,
 * and the next step in a tinted panel. The single grey paragraph it replaced
 * gave the action no more weight than the boilerplate around it, and the address
 * (the one thing worth double-checking) was buried mid-sentence.
 */
export function MagicLinkSent({
	title,
	lead,
	email,
	hint,
	children,
}: MagicLinkSentProps) {
	return (
		<div className={styles.sent}>
			<IconTile
				icon={IconMail}
				size="lg"
				tint="var(--gd-color-accent-subtle)"
				ink="var(--gd-color-accent)"
			/>

			<div className={styles.copy}>
				<h2 className={styles.title}>{title}</h2>
				<p className={styles.lead}>{lead}</p>
				{email && <p className={styles.email}>{email}</p>}
			</div>

			<div className={styles.hint}>
				<IconExternalLink size={18} stroke={2} className={styles.hintIcon} />
				<span>{hint}</span>
			</div>

			{children}
		</div>
	);
}
