import { useTranslate } from "@tolgee/react";
import Link from "next/link";
import GdhubLogo from "@/assets/images/gdhub-beta-logo.svg";
import { InverseBand } from "@/components/ui/InverseBand";
import { SocialLinks } from "./SocialLinks";
import styles from "./style.module.scss";

type FooterLink = { href: string; label: string; target?: string };
type FooterColumn = { title: string; links: FooterLink[] };

export const MainFooter = () => {
	const { t } = useTranslate();

	const columns: FooterColumn[] = [
		{
			title: t("mainFooter.platform", "Platform"),
			links: [
				{
					href: "/projects",
					label: t("mainFooter.gameProjects", "Video games"),
				},
				{
					href: "/vacancies",
					label: t("mainFooter.vacancies", "Open positions"),
				},
				{ href: "/events", label: t("mainFooter.events", "Events") },
				{ href: "/about", label: t("mainFooter.aboutUs", "About us") },
			],
		},
		{
			title: t("mainFooter.documentation", "Documentation"),
			links: [
				{
					href: "https://docs.gdhub.io",
					label: t("mainFooter.documentation", "Documentation"),
					target: "_blank",
				},
				{
					href: "https://docs.gdhub.io/gd/overview",
					label: t("mainFooter.gameIndustryGuide", "Game Industry Guide"),
					target: "_blank",
				},
				{
					href: "/blog",
					label: t("mainFooter.blog", "Blog"),
				},
			],
		},
		{
			title: t("mainFooter.legal", "Legal"),
			links: [
				{
					href: "/legal",
					label: t("mainFooter.allDocuments", "All documents"),
				},
				{
					href: "/legal/privacy-policy",
					label: t("mainFooter.privacyPolicy", "Privacy Policy"),
				},
				{
					href: "/legal/cookie-policy",
					label: t("mainFooter.cookiePolicy", "Cookie Policy"),
				},
				{
					href: "/legal/refund-policy",
					label: t("mainFooter.refundPolicy", "Refund Policy"),
				},
				{
					href: "/legal/terms-of-use",
					label: t("mainFooter.termsOfUse", "Terms of use"),
				},
				{
					href: "/legal-details",
					label: t("mainFooter.legalDetails", "Legal Details"),
				},
			],
		},
	];

	// The footer is dark wherever it lands — under a light public page or at the
	// end of the dark landing. Declaring it a band of its own means its contents
	// read the inverse roles in both places instead of guessing from context.
	return (
		<InverseBand>
			<footer className={styles.footer}>
				<div className={styles.container}>
					<div className={styles.top}>
						<div className={styles.brand}>
							<GdhubLogo className={styles.logo} />
							<p className={styles.description}>
								{t(
									"mainFooter.description",
									"A community of game industry professionals who form teams to make new games.",
								)}
							</p>
							<SocialLinks />
						</div>

						<nav
							className={styles.nav}
							aria-label={t("mainFooter.navAria", "Footer navigation")}
						>
							{columns.map((col) => (
								<div key={col.title} className={styles.column}>
									<h2 className={styles.columnTitle}>{col.title}</h2>
									<ul className={styles.linkList}>
										{col.links.map((link) => (
											<li key={`${link.href}-${link.label}`}>
												<Link
													href={link.href}
													className={styles.link}
													target={link.target}
												>
													{link.label}
												</Link>
											</li>
										))}
									</ul>
								</div>
							))}
						</nav>
					</div>

					<hr className={styles.divider} />

					<p className={styles.copyright}>
						© {new Date().getFullYear()}{" "}
						{t(
							"mainFooter.copyright",
							"Game Developers Hub. All rights reserved.",
						)}
					</p>
				</div>
			</footer>
		</InverseBand>
	);
};
