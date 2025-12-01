/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: <explanation> */

import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { videoParser } from "@hannal/editorjs-video-plugin";
import { IconExternalLink } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Avatar,
	Button,
	Divider,
	Flex,
	Grid,
	Modal,
	message,
	Typography,
	theme,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Blocks from "editorjs-blocks-react-renderer";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { formatEventPeriod } from "@/helpers/format";
import { gtmEventTrigger } from "@/helpers/gtm";
import styles from "./EventDefaultView.module.scss";

const { Title, Paragraph, Text } = Typography;

const MAX_VISIBLE_SPEAKERS = 3;

const EventDefaultView = ({
	event,
	workDirections,
	schedule,
}: {
	event: prismaClient.Event & { schedule: prismaClient.EventScheduleItem[] };
	workDirections: prismaClient.WorkDirection[];
	schedule: (prismaClient.EventScheduleItem & {
		speakers: prismaClient.User[];
	})[];
}) => {
	const { t, getLanguage } = useTolgee();
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();
	const { token } = theme.useToken();
	const [modal, modalContextHolder] = Modal.useModal();

	const { mutateAsync: registerToEvent, isPending: isRegistering } =
		useMutation({
			mutationFn: async () => {
				await axios.post(`/api/user/event/${event.id}/register`);
			},
			onSuccess: () => {
				modal.success({
					title: t("event.register.success.title", "Registration successful"),
					content: t(
						"event.register.success.description",
						"You have been successfully registered for the event.",
					),
				});
			},
			onError: () => {
				message.error(
					t(
						"event.register.error",
						"Failed to register for the event. Please try again later.",
					),
				);
			},
		});

	const isRegistrationAvailable =
		!schedule?.length ||
		dayjs().isBefore(
			dayjs(schedule[0]?.endDate || event.schedule?.[0]?.endDate),
		);

	return (
		<Flex gap={48} align="flex-start" className={styles.contentContainer}>
			{/* Левая колонка: инфо */}
			<div style={{ flex: 1 }}>
				<Title level={2}>{t("event.about", "About")}</Title>
				{event.content ? (
					<div className={styles.content}>
						<Blocks
							data={JSON.parse(event.content as string)}
							renderers={{
								video: ({ data }) => (
									<div
										className={`editorjs-video-block`}
										dangerouslySetInnerHTML={{
											__html: videoParser?.video({ data }) || "",
										}}
									/>
								),
							}}
						/>
					</div>
				) : (
					<Paragraph style={{ fontSize: 18 }}>
						<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>
							{event.description || ""}
						</ReactMarkdown>
					</Paragraph>
				)}

				<Divider />

				<Title level={2}>{t("event.schedule", "Schedule")}</Title>
				<div
					style={{
						marginBottom: 32,
					}}
				>
					{schedule.map((item: any, idx: number) => {
						const visibleSpeakers = (item.speakers || []).slice(
							0,
							MAX_VISIBLE_SPEAKERS,
						);
						const extraCount =
							(item.speakers?.length || 0) - MAX_VISIBLE_SPEAKERS;

						return (
							<div
								key={item.id || idx}
								style={{
									background: "#fdfdfd",
									paddingInline: 16,
									borderRadius: 8,
									paddingBlock: 16,
									marginBottom: 16,
								}}
							>
								{/* Линия 1: дата и title */}
								<Flex
									align="center"
									justify="space-between"
									gap={16}
									style={{ marginBottom: 4 }}
									wrap
								>
									<span
										style={{
											fontWeight: 600,
											fontSize: 15,
											color: "#222",
											whiteSpace: "nowrap",
										}}
									>
										{formatEventPeriod(
											item.startDate,
											item.endDate,
											getLanguage() || "en",
											"daytime",
										)}
									</span>

									{!!item.title && (
										<>
											<Divider type="vertical" style={{ height: 24 }} />

											<span
												style={{
													fontWeight: 600,
													fontSize: 15,
													color: "#222",
												}}
											>
												{item.title}
											</span>
										</>
									)}

									{!!item.url && (
										<Button
											href={item.url}
											target="_blank"
											className="black-btn"
											icon={
												<IconExternalLink size={18} style={{ opacity: 0.5 }} />
											}
											iconPosition="end"
										>
											{t("event.open", "Open")}
										</Button>
									)}
								</Flex>

								{/* Линия 2: описание */}
								{item.description && (
									<Text
										type="secondary"
										style={{ fontSize: 15, margin: "4px 0 10px 0" }}
									>
										<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>
											{item.description || ""}
										</ReactMarkdown>
									</Text>
								)}

								{/* Линия 3: спикеры */}
								{item.speakers?.length > 0 && (
									<Flex gap={24} style={{ marginTop: 16, flexWrap: "wrap" }}>
										{visibleSpeakers.map((sp: any, i: number) => {
											const speakerName =
												sp?.user?.profile?.name || sp?.user?.name || "";
											const speakerAvatar = sp?.user?.image || "";
											const speakerSpeciality = sp?.name || "";
											const speakerSummary = sp?.summary || "";
											return (
												<Flex
													key={sp.id || i}
													align="center"
													gap={12}
													style={{ minWidth: 220 }}
												>
													<Avatar
														size={64}
														src={speakerAvatar}
														style={{
															minWidth: 64,
															background: "#eee",
															color: "#222",
															fontSize: 18,
														}}
													>
														{!speakerAvatar && speakerName
															? speakerName[0]
															: null}
													</Avatar>
													<Flex vertical gap={0} style={{ minWidth: 0 }}>
														<span style={{ fontWeight: 600, fontSize: 15 }}>
															{speakerName}
														</span>
														{speakerSpeciality && (
															<span
																style={{
																	fontSize: 13,
																	color: token.colorTextSecondary,
																	fontWeight: 500,
																}}
															>
																{speakerSpeciality}
															</span>
														)}
														{speakerSummary && (
															<span style={{ fontSize: 13, color: "#888" }}>
																{speakerSummary}
															</span>
														)}
													</Flex>
												</Flex>
											);
										})}
										{extraCount > 0 && (
											<span
												style={{ marginLeft: 8, color: "#888", fontSize: 13 }}
											>
												+{extraCount}
											</span>
										)}
									</Flex>
								)}
							</div>
						);
					})}
				</div>

				{isRegistrationAvailable && (
					<div
						style={{ maxWidth: 420, margin: "40px 0 0", textAlign: "center" }}
					>
						{session?.user?.onboardingDone ? (
							event.url ? (
								<Link
									href={event.url}
									target="_blank"
									onClick={() => {
										gtmEventTrigger("event-register-click", {
											event_category: event.type,
											event_label: event.title,
											value: event.url,
											page_url: window.location.href,
										});
									}}
								>
									<Button
										type="primary"
										size="large"
										style={{ width: "100%", maxWidth: 420 }}
									>
										{t("event.register", "Register")}
									</Button>
								</Link>
							) : (
								<Button
									type="primary"
									size="large"
									style={{ width: "100%", maxWidth: 420 }}
									loading={isRegistering}
									onClick={() => registerToEvent()}
								>
									{t("event.bookNow", `Book Now ${event.isFree ? "Free" : ""}`)}
								</Button>
							)
						) : (
							<Link href="/registration">
								<Button
									type="primary"
									size="large"
									style={{ width: "100%", maxWidth: 420 }}
								>
									{t("event.loginOrRegister", "Login / Register")}
								</Button>
							</Link>
						)}
					</div>
				)}
			</div>
			{/* Правая колонка: картинка */}
			{event.image && screens.md && (
				<div
					style={{
						flex: "auto",
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "flex-end",
					}}
				>
					<div
						style={{
							position: "relative",
							width: "100%",
							maxWidth: 600,
							aspectRatio: "4/5",
							boxShadow: "0 4px 32px #0002",
							borderRadius: 18,
							overflow: "hidden",
						}}
					>
						<Image
							src={event.image}
							alt={event.title}
							fill
							style={{ objectFit: "cover" }}
						/>
					</div>
				</div>
			)}

			{modalContextHolder}
		</Flex>
	);
};

export default EventDefaultView;
