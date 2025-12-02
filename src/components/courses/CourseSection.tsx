import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";
import axios from "axios";
import type React from "react";
import { useEffect } from "react";

interface CourseSectionProps {
	title?: string;
	description?: string;
	CardComponent: React.ComponentType<{
		course: any;
		token: any;
	}>;
	token: any;
	colSpan?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
	onLoaded?: () => void | Promise<void>;
	onLoadingChange?: (isLoading: boolean) => void;
	records: prismaClient.Course[];
}

export const CourseSection = ({
	title,
	description,
	CardComponent,
	token,
	colSpan,
	onLoaded = () => {},
	onLoadingChange,
	records,
}: CourseSectionProps) => {
	if (!records?.length) return null;

	return (
		<section style={{ marginBottom: 32 }}>
			{!!title && (
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
			)}
			{!!description && (
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
				{records?.map((course) => (
					<Col
						key={course.id}
						{...(colSpan || { xs: 24, sm: 12, md: 8, lg: 8, xl: 6 })}
					>
						<CardComponent course={course} token={token} />
					</Col>
				))}
			</Row>
		</section>
	);
};
