"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Card as AntCard,
	Image as AntImage,
	Button,
	Descriptions,
	Divider,
	Flex,
	Form,
	Input,
	Modal,
	Select,
	Space,
	Typography,
} from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import React from "react";
import { getCleanTextContent } from "@/helpers/content";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

export interface ExpertPageProps {
	isAuthenticated: boolean;
	expert: any;
	seo?: {
		title?: string | null;
		description?: string | null;
		image?: string | null;
	};
}

export function ExpertPageClient({ expert, seo }: ExpertPageProps) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [modalOpen, setModalOpen] = React.useState(false);
	const [selectedProject, setSelectedProject] = React.useState<
		string | undefined
	>();
	const [selectedTopic, setSelectedTopic] = React.useState<
		string | undefined
	>();
	const [comment, setComment] = React.useState("");

	const { data: projectsData, isLoading: projectsLoading } = useQuery({
		queryKey: ["userProjects"],
		queryFn: () => axios.get("/api/user/projects"),
		enabled: !!session,
	});

	const projects = projectsData?.data || [];

	if (!expert) return null;

	const isActiveRequest = expert.speciality.questions?.length > 0;

	return (
		<PublicLayout
			seo={(seo ?? undefined) as any}
			subTitle={
				getCleanTextContent(expert.speciality.summary || "", 100) || undefined
			}
			backgroundImage={expert.image || undefined}
			styles={{ content: { padding: 0 }, layoutBackground: { padding: 0 } }}
			title={
				<div className={styles.titleContainer}>
					<Link href={`/experts`}>
						<Button
							type="text"
							size="small"
							className={styles.projectTitle}
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
								<ArrowLeftOutlined
									className="arrow"
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
									{t("page.expert.back", "Experts")}
								</span>
							</Space>
						</Button>
					</Link>
					<Title className={styles.title}>{expert.name}</Title>
				</div>
			}
		>
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

				<AntCard style={{ marginBottom: 24 }} styles={{ body: { padding: 0 } }}>
					<div style={{ padding: 16 }}>
						<Text type="secondary" style={{ fontSize: 14, letterSpacing: 1 }}>
							Ready to answer questions about
						</Text>
						{isActiveRequest ? (
							<ul
								style={{ margin: "16px 0 0 0", padding: 0, listStyle: "none" }}
							>
								{expert.speciality.questions?.map((q: string, idx: number) => (
									<li
										key={`question-${idx.toString()}`}
										style={{
											padding: "12px 0",
											borderBottom:
												idx !== expert.speciality.questions.length - 1
													? "1px solid #f0f0f0"
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

				<AntCard style={{ marginBottom: 36 }} styles={{ body: { padding: 0 } }}>
					<div style={{ padding: 16 }}>
						<Text type="secondary" style={{ fontSize: 14, letterSpacing: 1 }}>
							About the expert
						</Text>
						<Divider style={{ margin: "12px 0" }} />
						<Descriptions
							column={1}
							size="small"
							labelStyle={{ color: "#888", fontWeight: 400, fontSize: 14 }}
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

				<Button
					type="primary"
					size="large"
					style={{ width: "100%", marginBottom: 36 }}
					onClick={() => setModalOpen(true)}
					disabled={!isActiveRequest}
				>
					Request consultation
				</Button>

				{isActiveRequest && (
					<Modal
						title="Consultation request"
						centered
						open={modalOpen}
						onCancel={() => setModalOpen(false)}
						footer={null}
					>
						{!session ? (
							<div style={{ padding: 24, textAlign: "center" }}>
								<p>
									Чтобы отправить запрос, необходимо{" "}
									<a href="/signin">авторизоваться</a> на GDHub.
								</p>
							</div>
						) : projectsLoading ? (
							<div style={{ padding: 24, textAlign: "center" }}>
								Загрузка проектов...
							</div>
						) : projects.length === 0 ? (
							<div style={{ padding: 24, textAlign: "center" }}>
								<p>
									На данный момент помощь доступна только участникам проектов,
									размещённых на GDHub.
								</p>
							</div>
						) : (
							<Form>
								<div style={{ marginBottom: 16 }}>
									<Form.Item style={{ fontWeight: 500 }}>
										Select topic
									</Form.Item>
									<Select
										style={{ width: "100%" }}
										placeholder="Select topic"
										options={expert.speciality.questions.map((q: string) => ({
											label: q,
											value: q,
										}))}
										value={selectedTopic}
										onChange={setSelectedTopic}
									/>
								</div>
								<div style={{ marginBottom: 16 }}>
									<Form.Item style={{ fontWeight: 500 }}>
										Select your project
									</Form.Item>
									<Select
										style={{ width: "100%" }}
										placeholder="Select your project"
										options={projects.map((p: any) => ({
											label: p.name,
											value: p.id,
										}))}
										value={selectedProject}
										onChange={setSelectedProject}
									/>
								</div>
								<div style={{ marginBottom: 16 }}>
									<Form.Item style={{ fontWeight: 500 }}>
										Enter your question
									</Form.Item>
									<Input.TextArea
										rows={3}
										placeholder="Enter your question"
										value={comment}
										onChange={(e) => setComment(e.target.value)}
									/>
								</div>
								<Button
									type="primary"
									htmlType="submit"
									style={{ width: "100%" }}
									disabled={!selectedProject || !selectedTopic}
								>
									Send request
								</Button>
							</Form>
						)}
					</Modal>
				)}
			</div>
		</PublicLayout>
	);
}
