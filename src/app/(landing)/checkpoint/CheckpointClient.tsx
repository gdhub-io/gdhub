"use client";

import { useTolgee } from "@tolgee/react";
import { ConfigProvider } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import { type CSSProperties, useEffect, useState } from "react";
import { CheckpointAudienceSection } from "@/components/checkpoint-landing/CheckpointAudienceSection";
import { CheckpointCuratorChoiceSection } from "@/components/checkpoint-landing/CheckpointCuratorChoiceSection";
import { CheckpointCuratorsSection } from "@/components/checkpoint-landing/CheckpointCuratorsSection";
import { CheckpointExampleSection } from "@/components/checkpoint-landing/CheckpointExampleSection";
import { CheckpointFaqSection } from "@/components/checkpoint-landing/CheckpointFaqSection";
import { CheckpointFinalCtaSection } from "@/components/checkpoint-landing/CheckpointFinalCtaSection";
import { CheckpointHeroSection } from "@/components/checkpoint-landing/CheckpointHeroSection";
import { CheckpointHowItWorksSection } from "@/components/checkpoint-landing/CheckpointHowItWorksSection";
import { CheckpointPricingSection } from "@/components/checkpoint-landing/CheckpointPricingSection";
import { CheckpointProofSection } from "@/components/checkpoint-landing/CheckpointProofSection";
import { MainFooter } from "@/components/MainFooter";
import { MainHeader } from "@/components/MainHeader";
import { InverseBand } from "@/components/ui/InverseBand";
import { publicTheme } from "@/config/design";
import { designCssVariables } from "@/config/design/css";
import type { FeaturedCurator } from "@/repositories/checkpoint-curators";
import styles from "./checkpoint.module.scss";

// Marketing density on the light bands too; the dark ones get it from `InverseBand`.
const marketingVars = designCssVariables("light", "marketing") as CSSProperties;

export function CheckpointClient({
	curators,
}: {
	curators: FeaturedCurator[];
}) {
	const { getLanguage } = useTolgee();
	const [atTop, setAtTop] = useState(true);

	useEffect(() => {
		const onScroll = () => setAtTop(window.scrollY <= 0);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<ConfigProvider
			theme={publicTheme}
			locale={getLanguage() === "en" ? enLocale : ruLocale}
		>
			<div className={styles.page} style={marketingVars}>
				{/* The platform's own bar and footer, as on every other public page. */}
				<InverseBand
					transparent
					className={[styles.headerBand, atTop && styles.atTop]
						.filter(Boolean)
						.join(" ")}
				>
					<div className={styles.headerInner}>
						<MainHeader />
					</div>
				</InverseBand>

				{/* Marks the landing CTA; the bar above keeps the product button. */}
				<main data-gd-landing>
					<CheckpointHeroSection />
					<CheckpointProofSection />
					<CheckpointExampleSection />
					<CheckpointHowItWorksSection />
					<CheckpointCuratorChoiceSection />
					<CheckpointCuratorsSection curators={curators} />
					<CheckpointPricingSection />
					<CheckpointAudienceSection />
					<CheckpointFaqSection />
					<CheckpointFinalCtaSection />
				</main>

				<MainFooter />
			</div>
		</ConfigProvider>
	);
}
