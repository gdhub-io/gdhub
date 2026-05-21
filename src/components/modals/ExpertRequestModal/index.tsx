import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	Avatar,
	Divider,
	Flex,
	Form,
	Input,
	Modal,
	message,
	Select,
	Space,
	Spin,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useCallback, useEffect } from "react";
import styles from "./style.module.scss";

interface ExpertRequestModalProps {
	open: boolean;
	onCancel: () => void;
	expertId?: string;
	adviceRequestId?: string;
	onUpdate?: () => void;
}

type UserProject = {
	id: string;
	name: string;
	slug: string;
	description: string;
	coverImage: string;
	author: { name: string; image: string };
	workflow: {
		id: string;
		title: string;
		currentStep: prismaClient.ProjectWorkflowStep;
	} | null;
};

const { Title, Text } = Typography;

type ExpertProject = {
	id: string;
	name: string;
	slug: string;
	coverImage: string;
	genre: string;
	platform: string;
};

type ExpertResponse = {
	id: string;
	name: string;
	image?: string | null;
	lang?: "ru" | "en";
	memberInTeams?: Array<{ team?: { project?: ExpertProject | null } | null }>;
	specialities?: Array<{
		id: string;
		name: string;
		specialization: string;
		summary: string;
		timeForMentoring?: string | null;
		openForQuestions: string[];
		level: string;
		direction: { id: string; name: string };
	}>;
};

export default function ExpertRequestModal({
	adviceRequestId,
	open,
	onCancel,
	expertId,
	onUpdate,
}: ExpertRequestModalProps) {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { data: session } = useSession();

	const {
		data: adviceRequest,
		isLoading: adviceRequestLoading,
		refetch: refetchAdviceRequest,
	} = useQuery({
		queryKey: ["adviceRequest", adviceRequestId],
		queryFn: () =>
			axios
				.get<prismaClient.AdviceRequest>(
					`/api/user/advice-request/${adviceRequestId}`,
				)
				.then((res) => res.data),
		enabled: !!adviceRequestId && open,
	});

	const {
		data: expert,
		isLoading: expertLoading,
		refetch: refetchExpert,
	} = useQuery<ExpertResponse>({
		queryKey: ["expert", expertId],
		queryFn: () =>
			axios
				.get(`/api/expert/${expertId || adviceRequest?.toUserId}`)
				.then((res) => res.data),
		enabled: (!!expertId || !!adviceRequest?.toUserId) && open,
	});

	const { data: userProjects, isLoading: userProjectsLoading } = useQuery({
		queryKey: ["userProjects", session?.user.id],
		queryFn: () =>
			axios.get<UserProject[]>("/api/user/projects").then((res) => res.data),
		enabled: !!session?.user.id && open,
	});

	const {
		mutateAsync: createExpertRequest,
		isPending: isCreatingExpertRequest,
	} = useMutation({
		mutationFn: (data: Partial<prismaClient.AdviceRequest>) =>
			axios.post<prismaClient.AdviceRequest>("/api/user/advice-request", data),
	});

	const {
		mutateAsync: cancelExpertRequest,
		isPending: isCancellingExpertRequest,
	} = useMutation({
		mutationFn: ({ id }: { id: string }) =>
			axios.put<prismaClient.AdviceRequest>(
				`/api/user/advice-request/${id}/cancel`,
			),
	});

	useEffect(() => {
		if (adviceRequest) {
			form.setFieldsValue({
				topic: adviceRequest.topic,
				projectId: adviceRequest.projectId,
				comment: adviceRequest.comment,
			});
		}
	}, [adviceRequest]);

	const languageLabel =
		expert?.lang === "ru"
			? "Russian"
			: expert?.lang === "en"
				? "English"
				: undefined;

	const memberInProjects: ExpertProject[] = (expert?.memberInTeams || [])
		.map((m) => m.team?.project)
		.filter((p): p is ExpertProject => !!p);

	const questionOptions =
		expert?.specialities?.[0]?.openForQuestions.map((q) => ({
			label: q,
			value: q,
		})) || [];
	const userProjectOptions =
		userProjects?.map((p) => ({ label: p.name, value: p.id })) || [];

	const handleOk = async () => {
		const formData = await form.validateFields();

		await createExpertRequest({
			topic: formData.topic,
			projectId: formData.projectId,
			toUserId: expertId,
			comment: formData.comment,
		});

		form.resetFields();
		onUpdate?.();

		message.success(t("modal.expert.requestSent", "Your request is sent"));
	};

	const handleCancelRequest = useCallback(async () => {
		if (!adviceRequestId) return;

		await cancelExpertRequest({ id: adviceRequestId });
		await refetchAdviceRequest();

		onUpdate?.();
	}, [adviceRequestId]);

	return (
		<Modal
			centered
			title={null}
			width={800}
			destroyOnHidden
			mask={{ closable: false }}
			open={open}
			okButtonProps={{
				disabled:
					!userProjects?.length ||
					adviceRequestLoading ||
					isCreatingExpertRequest ||
					isCancellingExpertRequest ||
					(adviceRequest
						? adviceRequest.status !== prismaClient.AdviceRequestStatus.Created
						: false),
			}}
			okText={
				adviceRequestId &&
				adviceRequest?.status === prismaClient.AdviceRequestStatus.Created
					? t("modal.expert.cancelRequest", "Cancel request")
					: t("modal.expert.sendRequest", "Send request")
			}
			okType={
				adviceRequestId &&
				adviceRequest?.status === prismaClient.AdviceRequestStatus.Created
					? "danger"
					: "primary"
			}
			onOk={!adviceRequestId ? handleOk : handleCancelRequest}
			onCancel={onCancel}
		>
			<Spin
				spinning={
					expertLoading || isCreatingExpertRequest || adviceRequestLoading
				}
			>
				<Space orientation="vertical" style={{ width: "100%" }}>
					<div className={styles.cardHeader}>
						<Text type="secondary" className={styles.cardType}>
							{t("modal.expert.expertCard", "Expert card")}
						</Text>
						<div className={styles.expertTitle}>
							<Title level={2} style={{ margin: 0 }}>
								Request to {expert?.name}
							</Title>
							<Tag bordered={false}>{adviceRequest?.status}</Tag>
						</div>
					</div>

					{/* Expert information card */}
					<Flex vertical gap={12}>
						<Space align="start" size={16}>
							<Avatar
								src={expert?.image || undefined}
								shape="square"
								size={92}
							/>
							<Space orientation="vertical">
								<Title level={3} style={{ margin: 0 }}>
									{expert?.name}
								</Title>
								<div>
									<Text>{expert?.specialities?.[0]?.name}</Text>
									<br />
									<Text type="secondary">
										{expert?.specialities?.[0]?.specialization}
									</Text>
								</div>
								<Text>{expert?.specialities?.[0]?.summary}</Text>

								{/* Expert in projects */}
								{memberInProjects.length > 0 && (
									<Space align="start" size={16}>
										<Text>Member in projects</Text>

										<Space size={[8, 8]} wrap>
											{memberInProjects.map((p) => (
												<Space key={p.id} align="center" size={8}>
													<Avatar src={p.coverImage} shape="square" size={24} />
													<Text>{p.name}</Text>
												</Space>
											))}
										</Space>
									</Space>
								)}

								<Text>Speaking language: {languageLabel}</Text>
							</Space>
						</Space>
					</Flex>

					{/* Request form */}
					<Divider style={{ margin: "8px 0" }} />

					<Title level={3}>Ask a question</Title>

					{userProjects?.length ? (
						<>
							<Form
								form={form}
								layout="vertical"
								variant="filled"
								name="expert-request-form"
								disabled={!!adviceRequestId}
							>
								<Form.Item name="topic" rules={[{ required: true }]}>
									<Select
										options={questionOptions}
										loading={userProjectsLoading}
										placeholder="Select a topic"
									/>
								</Form.Item>
								<Form.Item name="projectId" rules={[{ required: true }]}>
									<Select
										options={userProjectOptions}
										loading={userProjectsLoading}
										placeholder="Select your project"
									/>
								</Form.Item>
								<Form.Item name="comment" rules={[{ required: false }]}>
									<Input.TextArea
										placeholder="Enter your comment (optional)"
										rows={6}
									/>
								</Form.Item>
							</Form>

							{/* Time for mentoring */}
							<Alert
								banner
								message={
									expert?.specialities?.[0]?.timeForMentoring ||
									"I will respond as soon as possible."
								}
							/>
						</>
					) : (
						<Alert message="You should have at least one project to ask a question" />
					)}
				</Space>
			</Spin>
		</Modal>
	);
}
