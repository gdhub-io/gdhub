"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { Flex, Layout, Typography } from "antd";
import Link from "next/link";
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import PublicHeaderBg from "@/assets/images/public-header-bg.png";
import { MainHeader } from "@/components/MainHeader";
import { InverseBand } from "@/components/ui/InverseBand";
import { optimizedImage } from "@/helpers/image";
import styles from "./style.module.scss";

const { Header } = Layout;
const { Title } = Typography;

interface PublicPageHeaderProps {
	title?: ReactNode;
	subTitle?: ReactNode;
	subLine?: ReactNode;
	backgroundImage?: string;
	/** Link back to the parent page, rendered above the title. */
	backTo?: { href: string; label: ReactNode };
	/** Extra content on the back-link row (breadcrumb tail, badges). */
	extra?: ReactNode;
	/**
	 * Pin the title block once the nav row has scrolled away, so the project
	 * stays named while its feed runs past underneath.
	 */
	sticky?: boolean;
}

/**
 * Hero block for a public page: MainHeader (the shared navigation) plus a
 * background image, a title, a subTitle and an optional extra slot.
 * The page renders it in its own JSX rather than the layout, so that each page
 * sets its own title/background.
 *
 * MainHeader sits INSIDE the hero block — visually they are one dark band
 * (as in the original `PublicLayout`).
 */
export function PublicPageHeader({
	title,
	subTitle,
	subLine,
	backgroundImage,
	backTo,
	extra,
	sticky = false,
}: PublicPageHeaderProps) {
	const navRef = useRef<HTMLDivElement>(null);
	// The nav row is the part allowed to leave: the hero sticks with exactly that
	// much pulled above the viewport, so the title strip lands at the top edge.
	// Measured rather than assumed — the row grows on a phone and with breadcrumbs.
	const [navHeight, setNavHeight] = useState(0);

	useEffect(() => {
		const node = navRef.current;
		if (!sticky || !node) return;

		const measure = () => setNavHeight(node.offsetHeight);
		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, [sticky]);
	// A CSS background gets no srcset, so the hero is requested once at the
	// widest layout it can reach.
	const heroImage = optimizedImage(backgroundImage, {
		width: 1920,
		quality: 70,
	});
	const background = heroImage
		? `linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.85) 40%, rgba(117, 19, 93, 0.3)), url(${heroImage})`
		: `url(${PublicHeaderBg.src})`;

	return (
		// The hero is artwork-dark, so everything inside it — the nav, the CTA —
		// has to read against a dark surface. `transparent` keeps the background
		// image visible while the roles and the antd theme flip underneath.
		// Sticky lives on the band, not on the header inside it: an element can
		// only stick within its own parent's box, and the band is the one that
		// sits in the page flow with the whole article below it.
		<InverseBand
			transparent
			className={sticky ? styles.stickyBand : undefined}
			style={
				sticky && navHeight
					? ({ "--public-nav-height": `${navHeight}px` } as CSSProperties)
					: undefined
			}
		>
			<Header
				className={styles.header}
				style={{ backgroundImage: background, position: "relative" }}
			>
				<div ref={navRef}>
					<MainHeader />
				</div>
				<div className={styles.titleContainer}>
					<Flex align="start" gap={8} vertical>
						{(!!backTo || !!extra) && (
							<Flex className={styles.extra} align="center" gap={8}>
								{!!backTo && (
									<Link href={backTo.href} className={styles.backLink}>
										<IconArrowLeft size={16} />
										<span>{backTo.label}</span>
									</Link>
								)}
								{extra}
							</Flex>
						)}
						{!!title && <Title className={styles.title}>{title}</Title>}
					</Flex>
					{!!subTitle && <div className={styles.subTitle}>{subTitle}</div>}
					{!!subLine && subLine}
				</div>
			</Header>
		</InverseBand>
	);
}
