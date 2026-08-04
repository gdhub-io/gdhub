/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: <explanation> */

import type {
	Event,
	EventScheduleItem,
	User,
	WorkDirection,
} from "@gdhub-io/gdhub-prisma";
import { IconExternalLink, IconMeteor } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Alert,
	Avatar,
	Button,
	Flex,
	Grid,
	Modal,
	message,
	Space,
	Typography,
	theme,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Blocks from "editorjs-blocks-react-renderer";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { editorjsRenderers } from "@/helpers/editorjs-renderers";
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
	event: Event & { schedule: EventScheduleItem[] };
	workDirections: WorkDirection[];
	schedule: (EventScheduleItem & {
		speakers: User[];
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
				gtmEventTrigger("event-register-click", {
					event_category: event.type,
					event_label: event.title,
					event_url: event.url,
					page_url: window.location.href,
				});

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
							renderers={editorjsRenderers}
						/>
					</div>
				) : (
					<Paragraph style={{ fontSize: 18 }}>
						<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>
							{event.description || ""}
						</ReactMarkdown>
					</Paragraph>
				)}

				<Title level={2} style={{ marginTop: 32 }}>
					{t("event.schedule", "Event Schedule")}
				</Title>
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
									background: "var(--gd-color-surface)",
									paddingInline: 16,
									borderRadius: 8,
									paddingBlock: 16,
									marginBottom: 16,
								}}
							>
								<Flex align="center" gap={32} justify="space-between">
									<IconMeteor size={36} />
									{/* Линия 1: дата и title */}
									<Flex vertical gap={0} style={{ flex: 1 }}>
										<Flex
											align="center"
											justify="space-between"
											gap={16}
											style={{ marginBottom: 4, flex: 1 }}
											wrap
										>
											<span
												style={{
													fontWeight: 600,
													fontSize: 18,
													color: "var(--gd-color-text)",
												}}
											>
												{item.title ||
													t("event.schedule.item.title", "Untitled")}
											</span>

											<span
												style={{
													fontWeight: 600,
													fontSize: 15,
													color: "var(--gd-color-text)",
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
										</Flex>

										{/* Линия 2: описание */}
										{item.description && (
											<Text type="secondary" className={styles.itemDescription}>
												<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>
													{item.description || ""}
												</ReactMarkdown>
											</Text>
										)}

										{/* Линия 3: спикеры */}
										{item.speakers?.length > 0 && (
											<Flex
												gap={24}
												style={{ marginTop: 16, flexWrap: "wrap" }}
											>
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
																	background: "var(--gd-color-border)",
																	color: "var(--gd-color-text)",
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
																	<span
																		style={{
																			fontSize: 13,
																			color: "var(--gd-color-text-secondary)",
																		}}
																	>
																		{speakerSummary}
																	</span>
																)}
															</Flex>
														</Flex>
													);
												})}
												{extraCount > 0 && (
													<span
														style={{
															marginLeft: 8,
															color: "var(--gd-color-text-secondary)",
															fontSize: 13,
														}}
													>
														+{extraCount}
													</span>
												)}
											</Flex>
										)}

										{!!item.url && (
											<div>
												<Button
													href={item.url}
													target="_blank"
													type="primary"
													icon={
														<IconExternalLink
															size={18}
															style={{ opacity: 0.5 }}
														/>
													}
													iconPosition="end"
												>
													{t("event.open", "Open")}
												</Button>
											</div>
										)}
									</Flex>
								</Flex>
							</div>
						);
					})}
				</div>

				{isRegistrationAvailable && (
					<div
						style={{ maxWidth: 420, margin: "40px 0 0", textAlign: "center" }}
					>
						{session?.user ? (
							event.url ? (
								<Link
									href={event.url}
									target="_blank"
									onClick={() => {
										gtmEventTrigger("event-register-click", {
											event_category: event.type,
											event_label: event.title,
											event_url: event.url,
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
							<Alert
								type="info"
								description={
									<Space orientation="vertical" size={16}>
										<Text>
											{t(
												"event.loginOrRegister",
												"For registration on the event, please signin or register on the platform first",
											)}
										</Text>
										<Button type="link" href="/registration">
											{t("event.loginOrRegister", "Signin or Register")}
										</Button>
									</Space>
								}
								title={t(
									"event.loginOrRegister",
									"You are not registered on the platform",
								)}
							/>
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
							boxShadow: "var(--gd-elevation-e3)",
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
