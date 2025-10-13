import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";
import axios from "axios";
import qs from "qs";
import type React from "react";
import { useEffect } from "react";

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
	const now = new Date();

	const {
		data: events = [],
		isLoading,
		isFetched,
	} = useQuery<any[]>({
		queryKey: ["events", eventTypes, timeStatus],
		queryFn: () => {
			return new Promise((resolve) => {
				setTimeout(() => {
					axios
						.get(`/api/events`, {
							params: {
								type: eventTypes,
								timeStatus,
								withDates: true,
							},
							paramsSerializer: (params) =>
								qs.stringify(params, { arrayFormat: "repeat" }),
						})
						.then((res) => resolve(res.data));
				}, 5000);
			});
		},
	});

	useEffect(() => {
		if (isFetched && events?.length) {
			onLoaded();
		}
	}, [events?.length, isFetched, onLoaded]);

	useEffect(() => {
		if (typeof onLoadingChange === "function") {
			onLoadingChange(isLoading);
		}
	}, [isLoading, onLoadingChange]);

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
