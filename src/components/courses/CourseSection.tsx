import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";
import axios from "axios";
import type React from "react";
import { type ReactNode, useEffect } from "react";
import { LoadError } from "@/components/ui";
import {
	type CourseColSpan,
	CourseGridSkeleton,
	DEFAULT_COURSE_COL_SPAN,
} from "./CourseSkeleton";

interface CourseSectionProps {
	title?: string;
	description?: string;
	CardComponent: React.ComponentType<{
		course: any;
		token: any;
	}>;
	token: any;
	colSpan?: CourseColSpan;
	onLoaded?: () => void | Promise<void>;
	onLoadingChange?: (isLoading: boolean) => void;
	queryKey?: string[];
	queryFn?: () => Promise<any[]>;
	/** Shown once loaded with nothing in it; without it an empty section is left out. */
	emptyState?: ReactNode;
}

export const CourseSection = ({
	title,
	description,
	CardComponent,
	token,
	colSpan,
	onLoaded = () => {},
	onLoadingChange,
	queryKey = ["courses"],
	queryFn,
	emptyState,
}: CourseSectionProps) => {
	const { data, isLoading, isPending, isFetched, isError, refetch } = useQuery<
		any[]
	>({
		queryKey,
		queryFn:
			queryFn || (() => axios.get("/api/courses").then((res) => res.data)),
	});

	const courses = data ?? [];
	const failed = isError && !data;

	useEffect(() => {
		if (isFetched && courses?.length) {
			onLoaded();
		}
	}, [courses?.length, isFetched, onLoaded]);

	useEffect(() => {
		if (typeof onLoadingChange === "function") {
			onLoadingChange(isLoading);
		}
	}, [isLoading, onLoadingChange]);

	if (!isPending && !failed && !courses?.length) return emptyState ?? null;

	return (
		<section style={{ marginBottom: 32 }}>
			{!!title && (
				<h2
					style={{
						marginTop: 56,
						marginBottom: 12,
						fontSize: 22,
						fontWeight: 700,
						color: "var(--gd-color-text)",
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
			{isPending ? (
				<CourseGridSkeleton colSpan={colSpan} />
			) : failed ? (
				<LoadError onRetry={() => refetch()} />
			) : (
				<Row gutter={[6, 12]}>
					{courses.map((course: any) => (
						<Col key={course.id} {...(colSpan || DEFAULT_COURSE_COL_SPAN)}>
							<CardComponent course={course} token={token} />
						</Col>
					))}
				</Row>
			)}
		</section>
	);
};
