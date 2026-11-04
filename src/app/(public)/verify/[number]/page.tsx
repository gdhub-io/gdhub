import dayjs from "dayjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getVerifyCertificate } from "@/app/api/verify/_helpers";
import { VerifyNumberClient } from "./VerifyNumberClient";

type Params = Promise<{ number: string }>;

const loadCertificate = cache(getVerifyCertificate);

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
