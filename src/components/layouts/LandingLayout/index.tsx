import { Layout } from "antd";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { MainFooter } from "@/components/MainFooter";
import { MainHeader } from "@/components/MainHeader";
import { InverseBand } from "@/components/ui/InverseBand";
import styles from "./style.module.scss";

const { Header, Footer, Content } = Layout;

const scrollIntoViewWithOffset = (selector: string, offset: number) => {
	const hookEl = document?.querySelector(selector);

	if (!hookEl) return;

	window.scrollTo({
		behavior: "smooth",
		top:
			hookEl.getBoundingClientRect().top -
			document.body.getBoundingClientRect().top -
			offset,
	});
};

export const LandingLayout = ({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) => {
	const pathname = usePathname();
	const [scrollY, setScrollY] = useState(0);

	useEffect(() => {
		if (document.location.hash) {
			setTimeout(() => {
				scrollIntoViewWithOffset(document.location.hash, 100);
			}, 300);
		}
	}, [pathname]);

	useEffect(() => {
		const handleScroll = () => setScrollY(window.scrollY);

		handleScroll();
		document.body.style.setProperty("overflow", "unset");
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		// The landing is dark end to end, so the whole shell is the band.
		<InverseBand>
			<Layout className={`${styles.container} ${className ?? ""}`}>
				<Header className={scrollY > 0 ? styles.fixedHeader : styles.header}>
					<MainHeader />
				</Header>
				<Content className={styles.content}>{children}</Content>
				<Footer className={styles.footer}>
					<MainFooter />
				</Footer>
			</Layout>
		</InverseBand>
	);
};
