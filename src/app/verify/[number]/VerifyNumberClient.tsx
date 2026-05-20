"use client";

import { IconArrowLeft, IconCopy, IconDownload } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, message, Space, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import type { VerifyCertificateResponse } from "@/app/api/verify/_helpers";
import VerifyCertGdhubCover from "@/assets/images/verify-cert-gdhub-cover.jpg";
import { VerifyForm } from "@/components/VerifyCertificate/VerifyForm";
import { VerifyHero } from "@/components/VerifyCertificate/VerifyHero";
import { VerifyNotFound } from "@/components/VerifyCertificate/VerifyNotFound";
import { VerifyResult } from "@/components/VerifyCertificate/VerifyResult";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "@/pages/verify/style.module.scss";

const { Title } = Typography;

export function VerifyNumberClient({
	number,
	data,
}: {
	number: string;
	data: VerifyCertificateResponse | null;
}) {
	const { t } = useTranslate();

	return (
		<PublicLayout
			title={
				<div className={styles.titleContainer}>
					<Link href={`/verify`}>
						<Button
							type="text"
							size="small"
							className={styles.backButton}
							onMouseEnter={(e) => {
								const button = e.currentTarget;
								const arrow = button.querySelector(".arrow") as HTMLElement;
								if (arrow) {
									arrow.style.width = "16px";
									arrow.style.marginRight = "8px";
									arrow.style.opacity = "1";
								}
								button.style.paddingLeft = "8px";
								button.style.paddingRight = "8px";
							}}
							onMouseLeave={(e) => {
								const button = e.currentTarget;
								const arrow = button.querySelector(".arrow") as HTMLElement;
								if (arrow) {
									arrow.style.width = "0";
									arrow.style.marginRight = "0";
									arrow.style.opacity = "0";
								}
								button.style.paddingLeft = "0";
								button.style.paddingRight = "0";
							}}
						>
							<Space size={0}>
								<IconArrowLeft
									className="arrow"
									size={16}
									style={{
										width: 0,
										marginRight: 0,
										opacity: 0,
										transition: "all 0.3s ease",
										overflow: "hidden",
										color: "#ff4d4f",
									}}
								/>
								<span style={{ color: "#ff4d4f" }}>
									{t("page.verify.back", "Verify another certificate")}
								</span>
							</Space>
						</Button>
					</Link>
					<Title className={styles.title}>
						{data
							? t("page.verify.number.title", "Verified certificate {number}", {
									number: data.number,
								})
							: t("page.verify.notFound.title", "Certificate not found")}
					</Title>
				</div>
			}
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
			seo={{
				title: data
					? `Certificate ${data.number}`
					: `Certificate ${number} — Not found`,
				description: data
					? `Verified certificate for ${data.participant.name} on ${dayjs(data.issuedAt).format("DD MMMM YYYY")}.`
					: `Certificate ${number} was not found.`,
				noindex: true,
				nofollow: true,
			}}
		>
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
		</PublicLayout>
	);
}
