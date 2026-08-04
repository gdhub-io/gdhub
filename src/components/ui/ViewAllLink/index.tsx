import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import styles from "./style.module.scss";

export type ViewAllLinkProps = {
	href: string;
	/** Already-translated, e.g. t("common.viewAll", "View all"). */
	label: string;
	className?: string;
};

/**
 * The one "there is more behind this" affordance.
 *
 * Card headers used to end in a mix of ghost buttons, plain links and arrows;
 * this is the single pattern — a link in the brand colour with a chevron.
 */
export function ViewAllLink({ href, label, className }: ViewAllLinkProps) {
	return (
		<Link
			href={href}
			className={`${styles.link}${className ? ` ${className}` : ""}`}
		>
			{label}
			<IconChevronRight size={15} stroke={2} />
		</Link>
	);
}
