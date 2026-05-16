import { IconArrowLeft, IconCopy, IconDownload } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, message, Space, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import VerifyCertGdhubCover from "@/assets/images/verify-cert-gdhub-cover.jpg";
import { VerifyForm } from "@/components/VerifyCertificate/VerifyForm";
import { VerifyHero } from "@/components/VerifyCertificate/VerifyHero";
import { VerifyNotFound } from "@/components/VerifyCertificate/VerifyNotFound";
import { VerifyResult } from "@/components/VerifyCertificate/VerifyResult";
import { PublicLayout } from "@/layouts/PublicLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import type { VerifyCertificateResponse } from "@/pages/api/verify/[[...params]]";
import { prisma } from "@/services/prisma";
import styles from "./style.module.scss";

type VerifyNumberPageProps = {
	number: string;
	data: VerifyCertificateResponse | null;
};

const { Title } = Typography;

const VerifyNumberPage: NextPageWithLayout<VerifyNumberPageProps> = ({
	number,
	data,
}) => {
	const { t } = useTranslate();

	const seoTitle = data
		? `Certificate ${data.number}`
		: `Certificate ${number} — Not found`;

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
				title: seoTitle,
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
};

export const getServerSideProps = async (
	context: GetServerSidePropsContext,
) => {
	const rawNumber = context.params?.number;
	const number = (Array.isArray(rawNumber) ? rawNumber[0] : rawNumber)?.trim();

	if (!number) {
		return { notFound: true };
	}

	const certificate = await prisma.eventCertificate.findUnique({
		where: { number },
		include: {
			eventMember: {
				include: {
					event: {
						select: {
							id: true,
							slug: true,
							lang: true,
							title: true,
							type: true,
							certificationOrganizerName: true,
							certificationOrganizerTitle: true,
							createdBy: {
								select: {
									name: true,
									profile: { select: { name: true } },
									specialities: {
										orderBy: { createdAt: "asc" },
										take: 1,
										select: { name: true },
									},
								},
							},
							schedule: { select: { startDate: true, endDate: true } },
						},
					},
					user: {
						select: {
							image: true,
							name: true,
							profile: { select: { name: true } },
							specialities: {
								orderBy: { createdAt: "desc" },
								take: 1,
								select: { name: true },
							},
						},
					},
					teamMember: {
						select: {
							position: true,
							team: {
								select: {
									project: {
										select: {
											name: true,
											slug: true,
											coverImage: true,
											description: true,
										},
									},
								},
							},
						},
					},
					mentors: {
						orderBy: { createdAt: "asc" },
						take: 1,
						select: {
							name: true,
							user: {
								select: {
									name: true,
									profile: { select: { name: true } },
									specialities: {
										orderBy: { createdAt: "desc" },
										take: 1,
										select: { name: true },
									},
								},
							},
						},
					},
				},
			},
		},
	});

	if (!certificate || certificate.externalId.startsWith("pending:")) {
		return {
			props: { number, data: null },
		};
	}

	const member = certificate.eventMember;
	const event = member.event;

	const startTimes = event.schedule
		.map((s) => s.startDate.getTime())
		.filter((t) => Number.isFinite(t));
	const endTimes = event.schedule
		.map((s) => s.endDate.getTime())
		.filter((t) => Number.isFinite(t));
	const startDate = startTimes.length
		? new Date(Math.min(...startTimes))
		: null;
	const endDate = endTimes.length ? new Date(Math.max(...endTimes)) : null;

	const defaultOrganizerName =
		event.createdBy.profile?.name?.trim() || event.createdBy.name?.trim() || "";
	const defaultOrganizerTitle =
		event.createdBy.specialities[0]?.name?.trim() || "";

	const participantName =
		member.user.profile?.name?.trim() || member.user.name?.trim() || "";

	const mentor = member.mentors[0];
	const mentorName = mentor
		? mentor.user?.profile?.name?.trim() ||
			mentor.user?.name?.trim() ||
			mentor.name.trim()
		: "";

	const project = member.teamMember?.team?.project ?? null;

	const data: VerifyCertificateResponse = {
		number: certificate.number,
		issuedAt: certificate.issuedAt.toISOString(),
		participant: {
			name: participantName,
			image: member.user.image,
			position: member.teamMember?.position?.trim() || null,
			specialty: member.user.specialities[0]?.name?.trim() || null,
		},
		event: {
			id: event.id,
			slug: event.slug,
			lang: event.lang,
			title: event.title,
			type: event.type,
			startDate: startDate?.toISOString() ?? null,
			endDate: endDate?.toISOString() ?? null,
			organizerName:
				event.certificationOrganizerName?.trim() || defaultOrganizerName,
			organizerTitle:
				event.certificationOrganizerTitle?.trim() || defaultOrganizerTitle,
			mentorName: mentorName || null,
			mentorSpecialty: mentor?.user?.specialities[0]?.name?.trim() || null,
		},
		project: project
			? {
					name: project.name,
					slug: project.slug,
					coverImage: project.coverImage,
					shortDescription: project.description,
				}
			: null,
	};

	return {
		props: { number, data },
	};
};

export default VerifyNumberPage;
