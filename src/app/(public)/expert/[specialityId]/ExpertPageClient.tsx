"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Card as AntCard,
	Image as AntImage,
	Button,
	Descriptions,
	Divider,
	Flex,
	Tooltip,
	Typography,
} from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { getCleanTextContent } from "@/helpers/content";
import { useContentPageView } from "@/hooks/useContentViews";

const ExpertRequestModal = dynamic(
	() => import("@/components/modals/ExpertRequestModal"),
	{ ssr: false },
);

const { Text, Title } = Typography;

export interface ExpertPageProps {
	expert: any;
	seo?: {
		title?: string | null;
		description?: string | null;
		image?: string | null;
	};
}

export function ExpertPageClient({ expert, seo }: ExpertPageProps) {
	// The public expert page is a speciality's page — that is what the route keys
	// on, and what carries the counter.
	useContentPageView("ExpertPage", expert?.speciality?.id);

	const { t } = useTranslate();
	const { data: session } = useSession();
	const [modalOpen, setModalOpen] = useState(false);

	const { data: projects, isLoading: projectsLoading } = useQuery({
		queryKey: ["userProjects", session?.user.id],
		queryFn: () =>
			axios.get<unknown[]>("/api/user/projects").then((res) => res.data),
		enabled: !!session,
	});

	if (!expert) return null;

	const questions: string[] = expert.speciality.openForQuestions ?? [];
	const isActiveRequest =
		expert.speciality.isOpenForMentoring && questions.length > 0;

	const blockedReason = !isActiveRequest
		? t(
				"page.expert.notTakingRequests",
				"The expert is not taking requests right now.",
			)
		: !session
			? t(
					"page.expert.signInToRequest",
					"Sending a request needs a GDHub account.",
				)
			: !projectsLoading && !projects?.length
				? t(
						"page.expert.membersOnly",
						"For now, help is available only to members of projects hosted on GDHub.",
					)
				: undefined;

	return (
		<>
			<PublicPageHeader
				subTitle={
					getCleanTextContent(expert.speciality.summary || "", 100) || undefined
				}
				backgroundImage={expert.image || undefined}
				title={expert.name}
				backTo={{
					href: "/experts",
					label: t("page.expert.back", "Experts"),
				}}
			/>
			<div className="layout-background">
				<div style={{ maxWidth: 740, margin: "0 auto", padding: 16 }}>
					<Flex vertical align="center" style={{ marginBottom: 24 }}>
						{expert.image && (
							<AntImage
								src={expert.image}
								alt={expert.name}
								width={120}
								height={120}
								style={{
									borderRadius: "50%",
									objectFit: "cover",
									marginBottom: 16,
								}}
								preview={false}
							/>
						)}
						<Title level={2} style={{ margin: 0, textAlign: "center" }}>
							{expert.name}
						</Title>
					</Flex>

					<AntCard
						style={{ marginBottom: 24 }}
						styles={{ body: { padding: 0 } }}
					>
						<div style={{ padding: 16 }}>
							<Text type="secondary" style={{ fontSize: 14, letterSpacing: 1 }}>
								Ready to answer questions about
							</Text>
							{isActiveRequest ? (
								<ul
									style={{
										margin: "16px 0 0 0",
										padding: 0,
										listStyle: "none",
									}}
								>
									{questions.map((q: string, idx: number) => (
										<li
											key={`question-${idx.toString()}`}
											style={{
												padding: "12px 0",
												borderBottom:
													idx !== questions.length - 1
														? "1px solid var(--gd-color-border)"
														: "none",
												fontSize: 18,
											}}
										>
											{q}
										</li>
									))}
								</ul>
							) : (
								<div style={{ margin: "16px 0 0 0" }}>
									<div style={{ fontSize: 16, fontWeight: 500 }}>
										The expert is not conducting consultations at this time
									</div>
								</div>
							)}
						</div>
					</AntCard>

					<AntCard
						style={{ marginBottom: 36 }}
						styles={{ body: { padding: 0 } }}
					>
						<div style={{ padding: 16 }}>
							<Text type="secondary" style={{ fontSize: 14, letterSpacing: 1 }}>
								About the expert
							</Text>
							<Divider style={{ margin: "12px 0" }} />
							<Descriptions
								column={1}
								size="small"
								labelStyle={{
									color: "var(--gd-color-text-secondary)",
									fontWeight: 400,
									fontSize: 14,
								}}
								contentStyle={{ fontSize: 16, fontWeight: 500 }}
							>
								<Descriptions.Item label="Summary">
									{expert.speciality.summary || "-"}
								</Descriptions.Item>
								<Descriptions.Item label="Speciality">
									{expert.speciality.name}
								</Descriptions.Item>
								<Descriptions.Item label="Specialization">
									{expert.speciality.specialization || "Concept art"}
								</Descriptions.Item>
								<Descriptions.Item label="Main language">
									{expert.lang}
								</Descriptions.Item>
							</Descriptions>
						</div>
					</AntCard>

					<Tooltip title={blockedReason}>
						<Button
							type="primary"
							size="large"
							block
							style={{ marginBottom: 36 }}
							onClick={() => setModalOpen(true)}
							disabled={!!blockedReason || projectsLoading}
						>
							{t("page.expert.requestConsultation", "Request consultation")}
						</Button>
					</Tooltip>

					{modalOpen && (
						<ExpertRequestModal
							open
							expertId={expert.id}
							onCancel={() => setModalOpen(false)}
							onUpdate={() => setModalOpen(false)}
						/>
					)}
				</div>
			</div>
		</>
	);
}
