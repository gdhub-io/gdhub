import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { FaChalkboardTeacher } from "@react-icons/all-files/fa/FaChalkboardTeacher";
import { HiOutlineTrash } from "@react-icons/all-files/hi/HiOutlineTrash";
import { HiOutlineX } from "@react-icons/all-files/hi/HiOutlineX";
import { TbDotsVertical } from "@react-icons/all-files/tb/TbDotsVertical";
import { TbHeart } from "@react-icons/all-files/tb/TbHeart";
import { TbHeartOff } from "@react-icons/all-files/tb/TbHeartOff";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Dropdown,
	Grid,
	message,
	Popconfirm,
	Space,
	Spin,
	Table,
	Tooltip,
	Typography,
} from "antd";
import type { ItemType } from "antd/es/menu/interface";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import LectureDetailsModal from "@/components/modals/LectureDetailsModal";
import LectureRequestModal from "@/components/modals/LectureRequestModal";
import PropositionLectureModal from "@/components/modals/PropositionLectureModal";
import SetLecturerModal from "@/components/modals/SetLecturerModal";

const { Title } = Typography;

export const RequestedLectures = ({
	onChange = () => {},
}: {
	onChange?: () => void;
}) => {
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();
	const { t } = useTranslate();
	// State
	const [selectedLectureId, setSelectedLectureId] = useState<string>();
	const [showLectureDetails, setShowLectureDetails] = useState(false);
	const [showSetLecturerModal, setShowSetLecturerModal] = useState(false);
	const [showLectureRequestModal, setShowLectureRequestModal] = useState(false);
	const [showPropositionLectureModal, setShowPropositionLectureModal] =
		useState(false);
	// Queries & mutations
	const { mutateAsync: createListener } = useMutation({
		mutationFn: (params: { lectureId: string }) =>
			axios.post("/api/user/lecture/listener", undefined, { params }),
		onSuccess: () => {
			updateList();
		},
	});
	const { mutateAsync: deleteListener } = useMutation({
		mutationFn: (params: { lectureId: string }) =>
			axios.delete("/api/user/lecture/listener", { params }),
		onSuccess: () => {
			updateList();
		},
	});

	const { mutateAsync: deleteLecture } = useMutation({
		mutationFn: ({ id }: { id: string }) =>
			axios.delete("/api/user/lecture", { params: { id } }),
		onSuccess: () => {
			updateList();
		},
	});

	const { mutateAsync: deleteLecturerRequest } = useMutation({
		mutationFn: ({ id, lectureId }: { id: string; lectureId: string }) =>
			axios.delete(`/api/user/lecture/${lectureId}/lecturer/${id}`),
		onSuccess: () => {
			updateList();
		},
	});

	const { data: workDirections } = useQuery({
		queryKey: ["workDirections"],
		queryFn: () =>
			axios.get<prismaClient.WorkDirection[]>(
				"/api/dictionary/work-directions",
			),

		staleTime: Infinity,
	});

	const mobileMenu: ItemType[] = useMemo(
		() => [
			{
				label: t("change", "Change"),
				key: "edit",
			},
			{
				label: t("delete", "Delete"),
				key: "delete",
			},
		],
		[],
	);

	const {
		data: requestedLectures,
		refetch: updateList,
		isLoading,
	} = useQuery({
		queryKey: ["lectures", "requested"],
		queryFn: () =>
			axios.get<
				(prismaClient.Lecture & {
					listeners: prismaClient.LectureListener[];
					direction: prismaClient.WorkDirection;
					lecturerRequests: (prismaClient.LecturerRequest & {
						user: prismaClient.User;
					})[];
					isRelevant: boolean;
					isAuthor: boolean;
				})[]
			>("/api/lectures", {
				params: {
					stage: [
						prismaClient.LectureStage.Requested,
						prismaClient.LectureStage.Actualized,
					].join(","),
				},
			}),
	});

	const columns: ColumnsType<
		prismaClient.Lecture & {
			listeners: prismaClient.LectureListener[];
			direction: prismaClient.WorkDirection;
			lecturerRequests: (prismaClient.LecturerRequest & {
				user: prismaClient.User;
			})[];
			isRelevant: boolean;
			isAuthor: boolean;
		}
	> = [
		{
			title: t("lecture.topic", "Lecture Topic"),
			dataIndex: "name",
			key: "name",
			width: screens.lg ? "auto" : "100%",
			render: (text, lecture) =>
				screens.md ? (
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
						<small>{t(`lecture.${lecture.stage}`, lecture.stage)}</small>
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
						<small>{lecture.direction.name}</small>
					</div>
				),
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
			title: screens.lg ? t("lecturer", "Lecturer") : null,
			responsive: ["md"],
			key: "Lecturer Name",
			render: (data: any, lecture) => {
				const applicatnsCount = lecture.listeners?.length || 0;
				const speaker = lecture.lecturerRequests?.find((l) => l.isSpeaker);
				const myLecturerRequest = lecture.lecturerRequests.find(
					(r) => r.userId == session?.user.id,
				);

				if (speaker) {
					return speaker.user.name;
				} else {
					return applicatnsCount >= 1 ? (
						<>
							{myLecturerRequest ? (
								<Space>
									<Button
										type="primary"
										onClick={(e) => {
											e.preventDefault();
											handleSetLecturer(lecture?.id);
										}}
									>
										<Space align="center">
											<FaChalkboardTeacher
												style={{ position: "relative", top: "2px" }}
											/>{" "}
											{t("lecture.myProposal", "My Proposal")}
										</Space>
									</Button>
									<Popconfirm
										title={t("lecture.areYouSure", "Are you sure?")}
										okText={t("lecture.yes", "Yes")}
										cancelText={t("lecture.no", "No")}
										onConfirm={() =>
											handleDeleteLecturerRequest(
												lecture.id,
												myLecturerRequest.id,
											)
										}
									>
										<Tooltip title={t("Don't want to be a lecturer")}>
											<Button type="text" icon={<HiOutlineX />} />
										</Tooltip>
									</Popconfirm>
								</Space>
							) : (
								<Button
									type="primary"
									onClick={() => handleSetLecturer(lecture?.id)}
								>
									<Space align="center">
										<FaChalkboardTeacher
											style={{ position: "relative", top: "2px" }}
										/>{" "}
										{t("lecture.becomeALecturer", "Become a Lecturer")}
									</Space>
								</Button>
							)}
						</>
					) : (
						<small>
							{t(
								"lecture.notYet",
								"Not yet, we are waiting for more people to come",
							)}
						</small>
					);
				}
			},
		},
		{
			title: null,
			key: "join-to-lecture",
			render: (_, lecture) => (
				<Space orientation="vertical">
					{lecture.isRelevant ? (
						<Space align="center">
							{t("lecture.relevant", "Relevant")}
							<Tooltip title={t("No longer relevant")}>
								<Button
									type="text"
									onClick={() => handleSetRelevantForMe(lecture.id, false)}
									icon={
										<TbHeartOff style={{ position: "relative", top: "2px" }} />
									}
								/>
							</Tooltip>
						</Space>
					) : (
						<Button
							type="primary"
							onClick={() => handleSetRelevantForMe(lecture.id, true)}
						>
							<Space align="center">
								<TbHeart style={{ position: "relative", top: "2px" }} />{" "}
								{t("lecture.wantToAttend", "Want to attend")}
							</Space>
						</Button>
					)}
					{lecture.listeners.length >= 3 && (
						<small>
							{t("lecture.relevantFor", "relevant for")}{" "}
							{lecture.listeners.length}{" "}
							{t("lecture.participants", "participants")}
						</small>
					)}
				</Space>
			),
		},
		{
			key: "actions",
			render: (_, lecture) =>
				!screens.md ? (
					<Dropdown menu={{ items: mobileMenu }} trigger={["click"]}>
						<TbDotsVertical
							size={16}
							style={{ position: "relative", top: 2 }}
						/>
					</Dropdown>
				) : lecture.requestedById === session?.user?.id &&
					(lecture.stage === prismaClient.LectureStage.Requested ||
						lecture.stage === prismaClient.LectureStage.Proposed) ? (
					<Space wrap={screens.md ? false : true}>
						<Button onClick={() => handleEditLectureRequest(lecture.id)}>
							{t("lecture.change", "Change")}
						</Button>
						<Popconfirm
							title={t("Are you sure you want to delete it?")}
							okText={t("lecture.yes", "Yes")}
							cancelText={t("lecture.no", "No")}
							onConfirm={() => handleDeleteLectureRequest(lecture.id)}
						>
							<Button type="text" danger>
								<HiOutlineTrash />
							</Button>
						</Popconfirm>
					</Space>
				) : null,
		},
	];

	const handleSetLecturer = async (lectureId: string) => {
		setSelectedLectureId(lectureId);
		setShowSetLecturerModal(true);
	};

	const handleEditLectureRequest = (lectureId: string) => {
		setSelectedLectureId(lectureId);
		setShowLectureRequestModal(true);
	};

	const handleDeleteLectureRequest = async (lectureId: string) => {
		try {
			await deleteLecture({ id: lectureId });

			message.success(t("Request for lecture has been deleted"));
		} catch (error: any) {
			message.error("Error");
		}
	};

	const handleDeleteLecturerRequest = async (
		lectureId: string,
		currentLecturerRequestId: string,
	) => {
		try {
			await deleteLecturerRequest({ id: currentLecturerRequestId, lectureId });

			message.success(t("Request for lecture has been deleted"));
		} catch (error: any) {
			message.error(t("Error"));
		}
	};

	const handleSetRelevantForMe = async (
		lectureId: string,
		isRelevant: boolean,
	) => {
		try {
			if (isRelevant) {
				await createListener({ lectureId });
			} else {
				await deleteListener({ lectureId });
			}

			await updateList();
			if (isRelevant) {
				message.success(t("Your vote has been counted"));
			} else {
				message.success(t("You have canceled your vote"));
			}
		} catch (error: any) {
			message.error(t("Error"));
		}
	};

	const handleSaveLectureRequest = async () => {
		setShowLectureRequestModal(false);
		setSelectedLectureId(undefined);
		await updateList();
	};

	const handleSaveSetLecturer = async () => {
		setShowSetLecturerModal(false);
		setSelectedLectureId(undefined);
		await updateList();
		onChange();
	};

	return (
		<>
			<Space wrap>
				<Button type="primary" onClick={() => setShowLectureRequestModal(true)}>
					{t("lecture.requestANewLecture", "Request a new lecture")}
				</Button>
				{/* <Button onClick={() => setShowPropositionLectureModal(true)}>{t('lecture.offerToGiveALecture', 'Offer to give a lecture')}</Button>*/}
			</Space>

			{requestedLectures?.data?.length ? (
				<>
					<div style={{ marginTop: 32 }}>
						<Title level={4}>
							{t("lecture.requestsForLectures", "Requests for lectures")}
						</Title>
						{t(
							"lecture.markLecturesThatYouWouldBeInterestedInAttending",
							"Mark lectures that you would be interested in attending.",
						)}
						<Spin spinning={isLoading}>
							<Table
								style={{
									border: "1px solid #aaa",
									borderRadius: "16px",
									padding: "8px",
									marginTop: 16,
								}}
								columns={columns}
								dataSource={requestedLectures.data.map((l: any) => ({
									...l,
									key: l.id,
								}))}
								pagination={false}
							/>
						</Spin>
					</div>

					<SetLecturerModal
						lectureId={selectedLectureId}
						open={showSetLecturerModal}
						onOk={handleSaveSetLecturer}
						onCancel={() => {
							setShowSetLecturerModal(false);
							setSelectedLectureId(undefined);
						}}
					/>

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

			<LectureRequestModal
				lectureId={selectedLectureId}
				open={showLectureRequestModal}
				onOk={handleSaveLectureRequest}
				onCancel={() => {
					setShowLectureRequestModal(false);
					setSelectedLectureId(undefined);
				}}
			/>

			<PropositionLectureModal
				lectureId={selectedLectureId}
				open={showPropositionLectureModal}
				onOk={() => setShowPropositionLectureModal(false)}
				onCancel={() => setShowPropositionLectureModal(false)}
			/>
		</>
	);
};
