import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { Col, Row } from "antd";
import axios from "axios";
import qs from "qs";
import type React from "react";
import { useEffect, useRef } from "react";

interface EventSectionProps {
	title: string;
	description?: string;
	eventTypes: prismaClient.$Enums.EventType[];
	timeStatus: ("upcoming" | "ongoing" | "past")[];
	CardComponent: React.ComponentType<{
		event: prismaClient.Event & { schedule: prismaClient.EventScheduleItem[] };
		token: any;
	}>;
	token: any;
	colSpan?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
	onLoaded?: () => void | Promise<void>;
	onLoadingChange?: (isLoading: boolean) => void;
}

export const EventSection = ({
	title,
	description,
	eventTypes,
	timeStatus,
	CardComponent,
	token,
	colSpan,
	onLoaded = () => {},
	onLoadingChange,
}: EventSectionProps) => {
	const { getLanguage } = useTolgee();

	const {
		data: events = [],
		isLoading,
		isFetched,
	} = useQuery<any[]>({
		queryKey: ["events", eventTypes, timeStatus],
		queryFn: () =>
			axios
				.get(`/api/events`, {
					params: {
						type: eventTypes,
						timeStatus,
						withDates: true,
						lang: getLanguage(),
					},
					paramsSerializer: (params) =>
						qs.stringify(params, { arrayFormat: "repeat" }),
				})
				.then((res) => res.data),
	});

	const onLoadedRef = useRef(onLoaded);
	onLoadedRef.current = onLoaded;

	useEffect(() => {
		if (isFetched && events?.length) {
			onLoadedRef.current();
		}
	}, [events?.length, isFetched]);

	const onLoadingChangeRef = useRef(onLoadingChange);
	onLoadingChangeRef.current = onLoadingChange;

	useEffect(() => {
		onLoadingChangeRef.current?.(isLoading);
	}, [isLoading]);

	if (!events?.length) return null;

	return (
		<section style={{ marginBottom: 32 }}>
			<h2
				style={{
					marginTop: 56,
					marginBottom: 12,
					fontSize: 22,
					fontWeight: 700,
					color: "#222",
				}}
			>
				{title}
			</h2>
			{description && (
				<div
					style={{
						color: token.colorTextSecondary,
						fontSize: 16,
						marginBottom: 20,
					}}
				>
					{description}
				</div>
			)}
			<Row gutter={[6, 12]}>
				{events?.map((event: any) => (
					<Col
						key={event.id}
						{...(colSpan || { xs: 24, sm: 12, md: 8, lg: 8, xl: 6 })}
					>
						<CardComponent event={event} token={token} />
					</Col>
				))}
			</Row>
		</section>
	);
};
