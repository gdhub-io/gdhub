"use client";

import {
	type Icon,
	IconBrandDiscord,
	IconBrandLinkedin,
	IconBrandTelegram,
	IconBrandYoutube,
	IconMail,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, ConfigProvider } from "antd";
import { type ReactNode, useState } from "react";
import { ContactModal } from "@/components/landing/ContactModal";
import { inverseProductTheme } from "@/config/design";
import styles from "./style.module.scss";

type Social = { icon: Icon; label: string; href: string; lang: "EN" | "RU" };

// English channels first, the Russian ones on their own row under them.
const SOCIALS: Social[][] = [
	[
		{
			icon: IconBrandTelegram,
			label: "Telegram",
			href: "https://t.me/gdhub_en",
			lang: "EN",
		},
		{
			icon: IconBrandDiscord,
			label: "Discord",
			href: "https://discord.gg/WcUFD3tHqg",
			lang: "EN",
		},
		{
			icon: IconBrandLinkedin,
			label: "LinkedIn",
			href: "https://www.linkedin.com/company/game-developers-hub",
			lang: "EN",
		},
	],
	[
		{
			icon: IconBrandTelegram,
			label: "Telegram",
			href: "https://t.me/gdhub_io",
			lang: "RU",
		},
		{
			icon: IconBrandYoutube,
			label: "YouTube",
			href: "https://www.youtube.com/@gamedev_hub",
			lang: "RU",
		},
	],
];

function Pill({
	icon: PillIcon,
	children,
	lang,
}: {
	icon: Icon;
	children: ReactNode;
	lang?: string;
}) {
	return (
		<>
			<PillIcon size={16} />
			{children}
			{lang && <span className={styles.lang}>{lang}</span>}
		</>
	);
}

/** Frames `FPnHS` / `M5bfOr`: where to find us, each channel tagged with its language. */
export function SocialLinks() {
	const { t } = useTranslate();
	const [writing, setWriting] = useState(false);

	return (
		// Product density: at the marketing one the pills outweigh the footer links.
		<ConfigProvider theme={inverseProductTheme}>
			<div className={styles.socials}>
				{SOCIALS.map((row, index) => (
					<div key={row[0].lang} className={styles.socialRow}>
						{index === 0 && (
							<Button
								size="small"
								className={styles.social}
								onClick={() => setWriting(true)}
							>
								<Pill icon={IconMail}>{t("mainFooter.email", "Email")}</Pill>
							</Button>
						)}
						{row.map((social) => (
							<Button
								key={social.href}
								size="small"
								className={styles.social}
								href={social.href}
								target="_blank"
								rel="noreferrer"
							>
								<Pill icon={social.icon} lang={social.lang}>
									{social.label}
								</Pill>
							</Button>
						))}
					</div>
				))}
				<ContactModal open={writing} onClose={() => setWriting(false)} />
			</div>
		</ConfigProvider>
	);
}
