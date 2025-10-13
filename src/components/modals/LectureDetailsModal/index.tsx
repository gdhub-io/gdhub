import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Grid, Modal, message, Spin } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { HeldContent } from "./HeldContent";
import { ReadyContent } from "./ReadyContent";
import { RequestedContent } from "./RequestedContent";
import styles from "./style.module.scss";

export type LectureDetails = prismaClient.Lecture & {
	lecturerRequests: (prismaClient.LecturerRequest & {
		user: prismaClient.User & { specialities: prismaClient.Speciality[] };
	})[];
	listeners: prismaClient.LectureListener[];
	direction: prismaClient.WorkDirection;
};

const LectureDetailsModal = ({ lectureId, open, onCancel }: any) => {
	const { data: session } = useSession();
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();
	// const [processing, setProcessing] = useState(true)
	// const [lecture, setLecture] = useState<any>()
	const [isReady, setIsReady] = useState(false);
	const [userIsRegistered, setUserIsRegistered] = useState(false);

	const {
		data: lecture,
		isLoading: processing,
		refetch,
	} = useQuery({
		queryKey: ["lecture-data", lectureId],
		queryFn: () =>
			axios.get<LectureDetails>(`/api/user/lecture/${lectureId}/show`),
		enabled: false,
	});

	useEffect(() => {
		if (!lecture?.data) return;

		setIsReady(true);
		setUserIsRegistered(
			!!lecture.data.listeners.find((l) => l.userId == session?.user.id),
		);
	}, [lecture?.data]);

	const {
		mutateAsync: registrationToLecture,
		isPending: registrationProcessing,
	} = useMutation({
		mutationFn: (params: { lectureId: string }) =>
			axios.post<any>(`/api/user/lecture/${lectureId}/registration`),
	});

	useEffect(() => {
		if (open && lectureId) {
			refetch();
		}
	}, [open]);

	const handleOk = async () => {
		try {
			const data = await registrationToLecture({ lectureId });

			// if (!data.newRegistration || userIsRegistered) {
			// message.info(t('You are already registered for this lecture'))
			// 	return
			// }

			setUserIsRegistered(true);
			message.success(t("Registration successful"));
		} catch (error: any) {
			message.error(error.message);
		}
	};

	const handleCancel = () => {
		setIsReady(false);
		onCancel();
	};

	const okText = () => {
		if (!lecture?.data) return null;

		if (lecture.data.stage == prismaClient.LectureStage.Ready) {
			return userIsRegistered
				? t(
						"modal.lectureDetails.youAreAlreadyRegistered",
						"You are already registered",
					)
				: t(
						"modal.lectureDetails.registrationForTheLecture",
						"Registration for the lecture",
					);
		}

		return null;
	};

	const modalTitle = () => {
		const defaultTitle = t(
			"modal.lectureDetails.lectureInformation",
			"Lecture Information",
		);

		if (!lecture?.data) return defaultTitle;

		if (["Requested", "Actualized"].includes(lecture.data.stage)) {
			return t(
				"modal.lectureDetails.lectureRequestInformation",
				"Lecture Request Information",
			);
		}

		if (["Proposed"].includes(lecture.data.stage)) {
			return t(
				"modal.lectureDetails.lectureProposalInformation",
				"Lecture Proposal Information",
			);
		}

		return defaultTitle;
	};

	return (
		<Modal
			className={styles.container}
			centered
			title={modalTitle()}
			destroyOnHidden
			width={screens.lg ? "50vw" : "100%"}
			maskClosable={false}
			cancelText={t("modal.lectureDetails.close", "Close")}
			okText={okText()}
			okButtonProps={{
				hidden: lecture?.data.stage !== prismaClient.LectureStage.Ready,
			}}
			open={open}
			onOk={handleOk}
			footer={isReady ? undefined : null}
			onCancel={handleCancel}
			confirmLoading={registrationProcessing}
		>
			<Spin spinning={processing}>
				{!!lecture && (
					<>
						{[
							prismaClient.LectureStage.Requested as string,
							prismaClient.LectureStage.Proposed as string,
							prismaClient.LectureStage.Actualized as string,
						].includes(lecture.data.stage) && (
							<RequestedContent lecture={lecture.data} />
						)}
						{lecture.data.stage == prismaClient.LectureStage.Ready && (
							<ReadyContent lecture={lecture.data} />
						)}
						{lecture.data.stage == prismaClient.LectureStage.Held && (
							<HeldContent lecture={lecture.data} />
						)}
					</>
				)}
			</Spin>
		</Modal>
	);
};

export default LectureDetailsModal;
