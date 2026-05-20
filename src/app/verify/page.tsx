"use client";

import { useTranslate } from "@tolgee/react";
import { Flex } from "antd";
import VerifyCertGdhubCover from "@/assets/images/verify-cert-gdhub-cover.jpg";
import { VerifyForm } from "@/components/VerifyCertificate/VerifyForm";
import { VerifyHero } from "@/components/VerifyCertificate/VerifyHero";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "@/pages/verify/style.module.scss";

export default function VerifyPage() {
	const { t } = useTranslate();

	return (
		<PublicLayout
			title={t("verify.hero.title", "Verify a Certificate")}
			subTitle={t(
				"verify.hero.subtitle",
				"Confirm the authenticity of a gdhub certificate by its number.",
			)}
			backgroundImage={VerifyCertGdhubCover.src}
			seo={{
				title: t("verify.hero.title", "Verify a Certificate"),
				description: t(
					"verify.hero.subtitle",
					"Confirm the authenticity of a gdhub certificate by its number.",
				),
				noindex: true,
				nofollow: true,
			}}
		>
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
		</PublicLayout>
	);
}
