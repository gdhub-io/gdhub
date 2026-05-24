"use client";

import { useTranslate } from "@tolgee/react";
import { Flex } from "antd";
import VerifyCertGdhubCover from "@/assets/images/verify-cert-gdhub-cover.jpg";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { VerifyForm } from "@/components/VerifyCertificate/VerifyForm";
import { VerifyHero } from "@/components/VerifyCertificate/VerifyHero";
import styles from "./style.module.scss";

export function VerifyClient() {
	const { t } = useTranslate();

	return (
		<>
			<PublicPageHeader
				title={t("verify.hero.title", "Verify a Certificate")}
				subTitle={t(
					"verify.hero.subtitle",
					"Confirm the authenticity of a gdhub certificate by its number.",
				)}
				backgroundImage={VerifyCertGdhubCover.src}
			/>
			<div className="layout-background">
				<Flex justify="center" className={styles.wrap}>
					<Flex
						vertical
						align="center"
						gap={32}
						className={styles.formPage}
						style={{ width: "100%", maxWidth: 600 }}
					>
						<VerifyHero />
						<VerifyForm />
					</Flex>
				</Flex>
			</div>
		</>
	);
}
