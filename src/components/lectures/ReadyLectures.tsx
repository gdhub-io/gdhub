import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Grid, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import LectureDetailsModal, {
	type LectureDetails,
} from "@/components/modals/LectureDetailsModal";

export const ReadyLectures = () => {
	const router = useRouter();
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();
	const [selectedLectureId, setSelectedLectureId] = useState<string>();
	const [showLectureDetails, setShowLectureDetails] = useState(false);
	const { data: readyLectures, isLoading: isLoadingReadyLectures } = useQuery({
		queryKey: ["lectures", "ready"],
		queryFn: () =>
			axios.get<LectureDetails[]>("/api/lectures", {
				params: {
					stage: [
						prismaClient.LectureStage.Ready,
						prismaClient.LectureStage.Proposed,
					].join(","),
				},
			}),
	});

	const { data: workDirections } = useQuery({
		queryKey: ["workDirections"],
		queryFn: () =>
			axios.get<prismaClient.WorkDirection[]>(
				"/api/dictionary/work-directions",
			),
		staleTime: Infinity,
	});

	const columns: ColumnsType<LectureDetails> = useMemo(
		() => [
			{
				title: t("lecture.topic", "Lecture Topic"),
				dataIndex: "name",
				key: "name",
				render: (text, lecture) => {
					const _date = dayjs(lecture.date).format("ll");

					return screens.md ? (
						<div
							role="button"
							tabIndex={0}
							style={{ cursor: "pointer" }}
							onClick={() => {
								setSelectedLectureId(lecture.id);
								setShowLectureDetails(true);
							}}
						>
							<strong>{text}</strong>
						</div>
					) : (
						<div
							role="button"
							tabIndex={0}
							style={{ cursor: "pointer" }}
							onClick={() => {
								setSelectedLectureId(lecture.id);
								setShowLectureDetails(true);
							}}
						>
							<strong>{text}</strong>
							<br />
							<small>{lecture.directionId}</small>
							<br />
							<small>
								{t("components.lectures.readyLectures.date", "Date")}: {_date}
							</small>
						</div>
					);
				},
			},
			{
				title: t("workDirection", "Work Direction"),
				dataIndex: "directionId",
				key: "directionId",
				responsive: ["md"],
				render(value) {
					const direction = workDirections?.data.find(
						(direction) => direction.id == value,
					);
					return direction?.name || "unknown";
				},
			},
			{
				title: t("lecturer", "Lecturer"),
				dataIndex: "lecturerId",
				key: "lecturerId",
				responsive: ["md"],
				render(data, record) {
					const speaker = record.lecturerRequests?.find((l) => l.isSpeaker);

					return speaker?.user.name;
				},
			},
			{
				title: t("date", "Date"),
				dataIndex: "date",
				key: "date",
				responsive: ["md"],
				render: (date) => {
					return dayjs(date).format("dd LLL yyyy, t");
				},
			},
			{
				key: "register-to-lecture",
				responsive: ["md"],
				render: (_, lecture) => (
					<Button
						onClick={() => {
							setSelectedLectureId(lecture.id);
							setShowLectureDetails(true);
						}}
					>
						{t("components.lectures.readyLectures.more", "More")}
					</Button>
				),
			},
		],
		[screens],
	);

	return (
		<>
			{readyLectures && readyLectures.data?.length > 0 ? (
				<>
					<div>
						<h3>
							{t(
								"components.lectures.readyLectures.scheduledLectures",
								"Scheduled lectures",
							)}
						</h3>
						<Spin spinning={isLoadingReadyLectures}>
							<Table
								style={{
									border: "1px solid #aaa",
									borderRadius: "16px",
									padding: "8px",
									background: "#c1e994",
								}}
								columns={columns}
								dataSource={readyLectures.data.map((l) => ({
									...l,
									key: l.id,
								}))}
								pagination={false}
							/>
						</Spin>
					</div>

					<LectureDetailsModal
						lectureId={selectedLectureId}
						open={showLectureDetails}
						onOk={() => {
							setShowLectureDetails(false);
							setSelectedLectureId(undefined);
						}}
						onCancel={() => {
							setShowLectureDetails(false);
							setSelectedLectureId(undefined);
						}}
					/>
				</>
			) : null}
		</>
	);
};
