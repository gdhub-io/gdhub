"use client";

import { useTolgee } from "@tolgee/react";
import { ConfigProvider } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import type { CSSProperties } from "react";
import { CheckpointAudienceSection } from "@/components/checkpoint/CheckpointAudienceSection";
import { CheckpointCuratorChoiceSection } from "@/components/checkpoint/CheckpointCuratorChoiceSection";
import { CheckpointCuratorsSection } from "@/components/checkpoint/CheckpointCuratorsSection";
import { CheckpointExampleSection } from "@/components/checkpoint/CheckpointExampleSection";
import { CheckpointFaqSection } from "@/components/checkpoint/CheckpointFaqSection";
import { CheckpointFinalCtaSection } from "@/components/checkpoint/CheckpointFinalCtaSection";
import { CheckpointHeroSection } from "@/components/checkpoint/CheckpointHeroSection";
import { CheckpointHowItWorksSection } from "@/components/checkpoint/CheckpointHowItWorksSection";
import { CheckpointPricingSection } from "@/components/checkpoint/CheckpointPricingSection";
import { CheckpointProofSection } from "@/components/checkpoint/CheckpointProofSection";
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

	return (
		<ConfigProvider
			theme={publicTheme}
			locale={getLanguage() === "en" ? enLocale : ruLocale}
		>
			<div className={styles.page} style={marketingVars}>
				{/* The platform's own bar and footer, as on every other public page. */}
				<InverseBand className={styles.headerBand}>
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
