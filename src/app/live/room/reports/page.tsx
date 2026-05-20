"use client";

import type { DailyCallOptions } from "@daily-co/daily-js";
import { DailyProvider, useCallFrame } from "@daily-co/daily-react";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Divider,
	Form,
	Input,
	type InputRef,
	Select,
	Space,
} from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { pipLayout } from "@/config/daily";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import styles from "./style.module.scss";

const dailyCallOptions: DailyCallOptions = {
	showLeaveButton: true,
	showFullscreenButton: true,
	showParticipantsBar: true,
	iframeStyle: {
		height: "100%",
		width: "100%",
		minWidth: "400px",
		border: "0",
		borderRadius: "12px",
	},
};

const LiveReportsPage = () => {
	const { data: session } = useSession();
	const { t } = useTranslate();
	const uuid = uuidv4();
	const callRef = useRef(null);
	const titleRef = useRef<InputRef>(null);
	const subTitleRef = useRef<InputRef>(null);
	const [form] = Form.useForm();
	const [instanceId, setInstanceId] = useState<string>();
	const [rtmpUrl, setrtmpUrl] = useState<string>(
		"rtmp://a.rtmp.youtube.com/live2",
	);
	const [streamKey, setStreamKey] = useState<string>(
		"rmv8-528k-updh-kf1r-1hx8",
	);
	const [meetingStarted, setMeetingStarted] = useState(false);
	const [streamMode, setStreamMode] = useState<
		string | number | boolean | undefined
	>(pipLayout.composition_params?.mode || "single");
	const [showTitleSlate, setShowTitleSlate] = useState<boolean>(false);

	const { data: token } = useQuery({
		queryKey: ["daily-co-token", session?.user.id],
		queryFn: () =>
			axios.get<{ token: string }>("/api/live/token", {
				params: { roomName: "reports" },
			}),
		refetchOnWindowFocus: false,
		refetchInterval: false,
		refetchOnMount: false,
	});

	const callFrame = useCallFrame({
		// TODO(daily): `parentEl` was removed from useCallFrame options in
		// @daily-co/daily-react 0.25. The hook now relies on the consumer
		// attaching the returned iframe via ref. Re-wire if/when reports UI
		// is verified end-to-end.
		parentElement: callRef.current as any,
		options: { ...dailyCallOptions, token: token?.data.token },
		shouldCreateInstance: useCallback(
			() => Boolean(callRef.current) && Boolean(token?.data.token),
			[token?.data],
		),
	} as any);

	useEffect(() => {
		if (!callFrame) return;

		callFrame.join({ url: "https://gdhub.daily.co/reports" });

		callFrame.on("joined-meeting", joinedMeeting);
		callFrame.on("left-meeting", () => leaveCall());

		return () => {
			callFrame.off("joined-meeting", joinedMeeting);
			callFrame.off("left-meeting", () => leaveCall());
		};
	}, [callFrame]);

	useEffect(() => {
		if (!callFrame || !instanceId) return;

		if (streamMode) {
			callFrame.updateLiveStreaming({
				instanceId: uuid,
				layout: { preset: "custom", composition_params: { mode: streamMode } },
			});
		}

		if (showTitleSlate) {
			callFrame.updateLiveStreaming({
				layout: {
					preset: "custom",
					composition_params: {
						showTitleSlate,
						"titleSlate.title": titleRef?.current?.input?.value || "Title",
						"titleSlate.subtitle":
							subTitleRef?.current?.input?.value || "Subtitle",
					},
				},
			});
		}

		console.log("ok");
	}, [streamMode, showTitleSlate]);

	const leaveCall = async () => {
		await callFrame?.destroy();
		setMeetingStarted(false);
		setInstanceId(undefined);
	};

	const joinedMeeting = () => {
		setMeetingStarted(true);
	};

	const startLiveStream = async () => {
		const formValidated = await form.validateFields();

		if (!formValidated || !callFrame) return;

		callFrame.startLiveStreaming({
			instanceId: uuid,
			rtmpUrl: [`${rtmpUrl}/${streamKey}`],
			width: 1920,
			height: 1080,
			layout: pipLayout,
		});

		setInstanceId(uuid);
	};

	const stopLiveStream = async () => {
		if (instanceId) {
			callFrame?.stopLiveStreaming({ instanceId: instanceId });
		} else {
			callFrame?.stopLiveStreaming();
		}

		setInstanceId(undefined);
	};

	const readyToStream = useMemo(() => {
		return !!rtmpUrl && !!streamKey && meetingStarted;
	}, [rtmpUrl, streamKey, meetingStarted]);

	return (
		<ProtectedLayout>
			<DailyProvider callObject={callFrame}>
				<main className="container">
					{session?.user.roles.includes(prismaClient.UserRole.Admin) && (
						<>
							<Space align="start">
								<Form
									form={form}
									layout="inline"
									variant="filled"
									validateMessages={{ required: "This field is required" }}
									initialValues={{ rtmpUrl, streamKey }}
								>
									<Form.Item name="rtmpUrl" rules={[{ required: true }]}>
										<Input
											placeholder={t(
												"pages.live.room.reports.rtmpUrl",
												"Rtml Url",
											)}
											htmlSize={40}
											onChange={(e) => setrtmpUrl(e.target.value)}
										/>
									</Form.Item>
									<Form.Item name="streamKey" rules={[{ required: true }]}>
										<Input
											placeholder="Stream Key"
											htmlSize={30}
											onChange={(e) => setStreamKey(e.target.value)}
										/>
									</Form.Item>
								</Form>
								{!instanceId ? (
									<Button
										onClick={startLiveStream}
										disabled={!readyToStream}
										type="primary"
									>
										{t("pages.live.room.reports.startStream", "Start a stream")}
									</Button>
								) : (
									<Button onClick={stopLiveStream}>
										{t("pages.live.room.reports.endStream", "End stream")}
									</Button>
								)}
							</Space>

							{!!instanceId && (
								<Space style={{ marginTop: 16 }} size={16}>
									<Select
										style={{ width: 200 }}
										defaultValue={streamMode}
										options={[
											{
												value: "single",
												label: t("pages.live.room.reports.single", "Single"),
											},
											{
												value: "split",
												label: t("pages.live.room.reports.split", "Split"),
											},
											{
												value: "grid",
												label: t("pages.live.room.reports.grid", "Grid"),
											},
											{
												value: "dominant",
												label: t(
													"pages.live.room.reports.dominant",
													"Dominant",
												),
											},
											{
												value: "pip",
												label: t("pages.live.room.reports.pip", "Pip"),
											},
										]}
										onSelect={(value) => setStreamMode(value)}
									/>
									<Divider type="vertical" />
									<Input
										ref={titleRef}
										placeholder={t("pages.live.room.reports.title", "Title")}
										defaultValue="Title"
									/>
									<Input
										ref={subTitleRef}
										placeholder={t(
											"pages.live.room.reports.subtitle",
											"Subtitle",
										)}
										defaultValue="Subtitle"
									/>
									<Button onClick={() => setShowTitleSlate((prev) => !prev)}>
										{showTitleSlate
											? t("pages.live.room.reports.hideTitleSlate", "Hide")
											: t(
													"pages.live.room.reports.showTitleSlate",
													"Show",
												)}{" "}
										Title Slate
									</Button>
								</Space>
							)}
						</>
					)}

					<div ref={callRef} className={styles.callFrame} />
				</main>
			</DailyProvider>
		</ProtectedLayout>
	);
};

export default LiveReportsPage;
