import dayjs from "dayjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { VerifyCertificateResponse } from "@/app/api/verify/_helpers";
import { prisma } from "@/services/prisma";
import { VerifyNumberClient } from "./VerifyNumberClient";

type Params = Promise<{ number: string }>;

const loadCertificate = cache(
	async (number: string): Promise<VerifyCertificateResponse | null> => {
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
			return null;
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
			event.createdBy.profile?.name?.trim() ||
			event.createdBy.name?.trim() ||
			"";
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

		return {
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
	},
);

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { number } = await params;
	const data = await loadCertificate(number);
	return {
		title: data
			? `Certificate ${data.number}`
			: `Certificate ${number} — Not found`,
		description: data
			? `Verified certificate for ${data.participant.name} on ${dayjs(data.issuedAt).format("DD MMMM YYYY")}.`
			: `Certificate ${number} was not found.`,
		alternates: { canonical: `/verify/${number}` },
		robots: { index: false, follow: false },
	};
}

export default async function VerifyNumberPage({ params }: { params: Params }) {
	const { number } = await params;
	const trimmed = number?.trim();
	if (!trimmed) notFound();

	const data = await loadCertificate(trimmed);
	return <VerifyNumberClient number={trimmed} data={data} />;
}
