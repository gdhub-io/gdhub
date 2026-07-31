"use client";

import { IconCopy, IconDownload } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, message, Space, Tooltip } from "antd";
import dayjs from "dayjs";
import type { VerifyCertificateResponse } from "@/app/api/verify/_helpers";
import VerifyCertGdhubCover from "@/assets/images/verify-cert-gdhub-cover.jpg";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { VerifyForm } from "@/components/VerifyCertificate/VerifyForm";
import { VerifyHero } from "@/components/VerifyCertificate/VerifyHero";
import { VerifyNotFound } from "@/components/VerifyCertificate/VerifyNotFound";
import { VerifyResult } from "@/components/VerifyCertificate/VerifyResult";
import styles from "../style.module.scss";

export function VerifyNumberClient({
	number,
	data,
}: {
	number: string;
	data: VerifyCertificateResponse | null;
}) {
	const { t } = useTranslate();

	return (
		<>
			<PublicPageHeader
				title={
					data
						? t("page.verify.number.title", "Verified certificate {number}", {
								number: data.number,
							})
						: t("page.verify.notFound.title", "Certificate not found")
				}
				backTo={{
					href: "/verify",
					label: t("page.verify.back", "Verify another certificate"),
				}}
				subTitle={
					data
						? t(
								"page.verify.number.subtitle",
								"Issued to {name} on {issuedAt}.",
								{
									name: data.participant.name,
									event: data.event.title,
									issuedAt: dayjs(data.issuedAt).format("DD MMMM YYYY"),
								},
							)
						: t(
								"page.verify.notFound.subtitle",
								"We couldn't find a signed certificate with this number.",
							)
				}
				subLine={
					<Space style={{ marginTop: 16 }}>
						<Button
							key="copy-link"
							type="default"
							icon={<IconCopy size={16} />}
							className={styles.projectLink}
							onClick={() => {
								navigator.clipboard.writeText(window.location.href);
								message.success(
									t("verify.result.copied", "Certificate link copied"),
								);
							}}
						>
							{t("verify.result.copy", "Copy link")}
						</Button>

						<Tooltip title={t("verify.result.download", "Download PDF")}>
							<Button
								key="download-pdf"
								type="text"
								className={styles.projectLink}
								icon={<IconDownload size={16} />}
								onClick={() => {
									window.open(
										`/api/verify/${encodeURIComponent(number)}/download`,
										"_blank",
									);
								}}
							/>
						</Tooltip>
					</Space>
				}
				backgroundImage={VerifyCertGdhubCover.src}
			/>
			<div className="layout-background">
				<Flex justify="center" className={styles.wrap}>
					{data ? (
						<VerifyResult data={data} />
					) : (
						<Flex
							vertical
							align="center"
							gap={32}
							className={styles.formPage}
							style={{ width: "100%", maxWidth: 600 }}
						>
							<VerifyHero />
							<VerifyForm initialNumber={number} hasError />
							<VerifyNotFound number={number} />
						</Flex>
					)}
				</Flex>
			</div>
		</>
	);
}
