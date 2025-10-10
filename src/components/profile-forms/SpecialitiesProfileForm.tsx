import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { GiSkills } from "@react-icons/all-files/gi/GiSkills";
import { GoPlus } from "@react-icons/all-files/go/GoPlus";
import { GoTrash } from "@react-icons/all-files/go/GoTrash";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Card, List, message, Popconfirm, Space, Spin, Typography } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import SpecialityModal from "./modals/SpecialityModal";

const { Text } = Typography;

const SpecialitiesProfileForm = ({ profile }: any) => {
	const router = useRouter();
	const pendingInvitationId = useMemo(
		() => router.query.pendingInvitation,
		[router.query.pendingInvitation],
	);
	const session = useSession();
	const queryClient = useQueryClient();
	const { t } = useTranslate();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedSpeciality, setSelectedSpeciality] = useState<any>();

	const { data: specialities, isFetching: processing } = useQuery({
		queryKey: ["user-specialities"],
		queryFn: () => axios.get<prismaClient.Speciality[]>("/api/user/specialities"),
	});

	const { data: pendingTeamInvitation } = useQuery({
		queryKey: ["pending-invitation", pendingInvitationId],
		queryFn: () =>
			axios.get<prismaClient.TeamInvitation[]>("/api/user/project/team/invitation", {
				params: { teamInvitationId: pendingInvitationId },
			}),
		enabled: !!pendingInvitationId,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deleteSpeciality } = useMutation({
		mutationFn: (params: any) => axios.delete("/api/user/speciality", { params }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-specialities"] }),
	});

	const { mutateAsync: completePendingInvitation, isPending: isCompletingInvitation } = useMutation(
		{
			mutationFn: (invitationId: string) =>
				axios.get(
					`/api/user/project/team/complete-pending-invitation?invitationId=${pendingInvitationId}`,
				),
			onSuccess: (response) => {
				if (response.data.redirect) {
					router.push(response.data.redirect);
				} else {
					router.push("/profile/specialities");
				}
			},
			onError: () => {
				// В случае ошибки просто перенаправляем на страницу специализаций
				router.push("/profile/specialities");
			},
		},
	);

	useEffect(() => {
		if (!pendingInvitationId) return;

		showModal();
	}, [pendingInvitationId]);

	const showModal = () => {
		setSelectedSpeciality(null);
		setIsModalOpen(true);
	};

	const handleOk = async (options: { invitationCompleted?: boolean } | undefined) => {
		// close modal
		setIsModalOpen(false);
		// complete pending invitation
		if (pendingInvitationId && options?.invitationCompleted) {
			await completePendingInvitation(pendingInvitationId as string);
		}
		// update speciality list
		await queryClient.invalidateQueries({ queryKey: ["user-specialities"] });
		// refresh session data
		await session.update({
			roles: session.data?.user.roles.includes(prismaClient.UserRole.Member),
		});
	};

	const handleCancel = () => {
		setSelectedSpeciality(null);
		setIsModalOpen(false);
	};

	const handleEditSpeciality = (speciality: any) => {
		setSelectedSpeciality(speciality);
		setIsModalOpen(true);
	};

	const handleDeleteSpeciality = async (specialityId: string) => {
		try {
			await deleteSpeciality({ id: specialityId });

			message.success(t("Specialty has been removed"));
		} catch (error: any) {
			message.error("Error");
		}
	};

	return (
		<Card title={t("profile-forms.specialities.card.title", "Specialties")} bordered={false}>
			<Spin spinning={processing}>
				<Space direction="vertical" size="large" style={{ width: "100%" }}>
					<Text>
						{t(
							"profile-forms.specialities.card.description",
							"Specialties allow you to respond to vacancies from existing projects and conduct lectures.",
						)}
					</Text>
					{specialities?.data && (
						<List
							size="small"
							bordered
							locale={{
								emptyText: (
									<Space direction="vertical">
										<GiSkills size={24} />
										<span>
											{t(
												"profile-forms.specialities.card.no-specialities",
												"You have not added a single specialty yet.",
											)}
										</span>
										<Button type="primary" icon={<GoPlus />} onClick={showModal}>
											{t("profile-forms.specialities.card.button.add-speciality", "Add")}
										</Button>
									</Space>
								),
							}}
							dataSource={specialities.data}
							renderItem={(speciality: prismaClient.Speciality) => (
								<List.Item>
									<List.Item.Meta
										title={
											<>
												{speciality.name}
												<div style={{ opacity: 0.5, fontSize: "11px" }}>{speciality.level}</div>
											</>
										}
										description={speciality.specialization}
									/>
									<Space>
										<Button onClick={() => handleEditSpeciality(speciality)}>
											{t("profile-forms.specialities.card.button.change-speciality", "Change")}
										</Button>
										<Popconfirm
											title={t(
												"profile-forms.specialities.card.button.delete-speciality",
												"You definitely want to remove?",
											)}
											okText={t(
												"profile-forms.specialities.card.button.delete-speciality-yes",
												"Yes",
											)}
											cancelText={t(
												"profile-forms.specialities.card.button.delete-speciality-no",
												"No",
											)}
											onConfirm={() => handleDeleteSpeciality(speciality.id)}
										>
											<Button type="text" danger icon={<GoTrash />} />
										</Popconfirm>
									</Space>
								</List.Item>
							)}
						/>
					)}
					{!!specialities?.data.length && (
						<Button type="primary" onClick={showModal}>
							{t("profile-forms.specialities.card.button.add-speciality", "Add specialty")}
						</Button>
					)}
				</Space>
				<SpecialityModal
					speciality={selectedSpeciality}
					teamInvitation={pendingTeamInvitation?.data as any}
					open={isModalOpen}
					onOk={handleOk}
					onCancel={handleCancel}
				/>
			</Spin>
		</Card>
	);
};

export default SpecialitiesProfileForm;
