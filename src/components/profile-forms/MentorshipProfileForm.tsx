import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { FiTrash2 } from "@react-icons/all-files/fi/FiTrash2";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	Button,
	Card,
	Flex,
	Form,
	Input,
	message,
	Spin,
	Switch,
	Tooltip,
	Typography,
} from "antd";
import Select from "antd/es/select";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { DynamicRowList } from "@/components/shared/DynamicRowList";

const { Paragraph, Text } = Typography;

type MentorshipProfileFormArgs = {
	profile: prismaClient.Profile;
	onUpdate: () => Promise<void> | void;
};

const MentorshipProfileForm = ({
	profile,
	onUpdate = () => {},
}: MentorshipProfileFormArgs) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const [enabled, setEnabled] = useState(false);
	const [selectedSpecialityId, setSelectedSpecialityId] = useState<
		string | null
	>(null);
	const { data: session, update: refreshSession } = useSession();
	const maxQuestions = 5;
	const openForQuestions =
		Form.useWatch<string[]>("openForQuestions", form) ?? [];

	const { mutateAsync: switchMentorship, isPending: isSwitching } = useMutation(
		{
			mutationFn: ({ enabled }: { enabled: boolean }) =>
				axios.put<any>("/api/user/profile/mentorship", { enabled }),
			onSuccess: ({ data }) => setEnabled(data.enabled),
		},
	);

	useEffect(() => {
		if (session) {
			setEnabled(
				session.user.roles.includes(prismaClient.$Enums.UserRole.Mentor),
			);
		}
	}, [session]);

	useEffect(() => {
		if (selectedSpecialityId) {
			const speciality = specialities?.data.find(
				(r: any) => r.id === selectedSpecialityId,
			);

			if (speciality) {
				form.setFieldsValue({
					timeForMentoring: speciality.timeForMentoring,
					openForQuestions: speciality.openForQuestions,
				});
			}
		}
	}, [selectedSpecialityId]);

	const { mutateAsync: saveMentorshipSetting, isPending: isSaving } =
		useMutation({
			mutationFn: (data: {
				specialityId: string;
				timeForMentoring: string;
				openForQuestions: string[];
			}) => axios.put<any>("/api/user/profile/mentorship", data),
			onSuccess: async () => {
				await refetchSpecialityList();
			},
		});

	const {
		data: specialities,
		isLoading: isSpecialityFetching,
		refetch: refetchSpecialityList,
		dataUpdatedAt,
	} = useQuery({
		queryKey: ["user-specialities", "mentorship"],
		queryFn: () =>
			axios.get<any>("/api/user/specialities", {
				params: {
					level: [
						prismaClient.$Enums.SkillLevel.Experienced,
						prismaClient.$Enums.SkillLevel.Expert,
					],
				},
			}),
		enabled,
	});

	useEffect(() => {
		if (!selectedSpecialityId && specialities?.data) {
			form.setFieldsValue({
				specialityId: specialities?.data[0].id,
				timeForMentoring: specialities?.data[0].timeForMentoring,
				openForQuestions: specialities?.data[0].openForQuestions,
			});
		}
	}, [specialities?.data, dataUpdatedAt]);

	const handleForm = async () => {
		try {
			const data = await form.validateFields();

			await saveMentorshipSetting(data);
			await onUpdate();

			message.success(
				t(
					"profile-forms.mentorship.update-message",
					"Mentorship settins is updated",
				),
			);
		} catch {}
	};

	const switchMentorshipStatus = async (checked: boolean) => {
		await switchMentorship({ enabled: checked });
		await refreshSession();

		if (!checked) {
			form.resetFields();
			setSelectedSpecialityId(null);
		}
	};

	const specialityListOptions = specialities?.data.map((r: any) => ({
		label: t(`components.profile-forms.mentorship.card.${r.name}`, r.name),
		value: r.id,
	}));

	return (
		<Card
			title={t("components.profile-forms.mentorship.card.title", "Mentorship")}
			variant="borderless"
			extra={
				<Tooltip
					title={
						<Text>
							{t(
								"components.profile-forms.mentorship.card.description",
								"Turn on if you want other community members to contact you for advice.",
							)}
						</Text>
					}
				>
					<Switch
						checked={enabled}
						loading={isSwitching}
						onChange={switchMentorshipStatus}
					/>
				</Tooltip>
			}
		>
			<Spin spinning={isSaving}>
				<Paragraph>
					{t(
						"components.profile-forms.mentorship.card.description",
						"Allows you to contribute to game development through advising",
					)}
				</Paragraph>
				{enabled && !!specialities?.data.length && (
					<Form
						form={form}
						layout="vertical"
						variant="filled"
						name="profile-mentorship-form"
						autoComplete="off"
						requiredMark="optional"
						initialValues={
							{
								/** some fileds */
							}
						}
					>
						<Form.Item
							label={t(
								"profile-forms.mentorship.field.speciality.label",
								"Speciality in which you can help",
							)}
							rules={[{ required: true }]}
							name="specialityId"
						>
							<Select
								options={specialityListOptions}
								style={{ width: "100%" }}
								placeholder={t("Select")}
								onChange={(value) => setSelectedSpecialityId(value)}
								loading={isSpecialityFetching}
							/>
						</Form.Item>

						{(() => {
							return (
								<Form.Item
									label={
										<Flex justify="space-between" align="center" gap={8}>
											<span>
												{t(
													"profile-forms.mentorship.field.openForQuestions.label",
													"A list of questions that can be addressed to you",
												)}
											</span>
											<Text type="secondary">
												({openForQuestions.length}/{maxQuestions})
											</Text>
										</Flex>
									}
									name="openForQuestions"
									rules={[{ required: true }]}
								>
									<DynamicRowList<string>
										maxItems={maxQuestions}
										addPlaceholder={t(
											"profile-forms.mentorship.field.openForQuestions.addPlaceholder",
											"Add question",
										)}
										renderRow={({ value, onChange, remove }) => (
											<Flex gap={8} align="center" style={{ width: "100%" }}>
												<Input
													value={value}
													style={{ width: "100%" }}
													placeholder={t(
														"profile-forms.mentorship.field.openForQuestions.placeholder",
														"Question",
													)}
													onChange={(event) => onChange(event.target.value)}
													onPressEnter={(event) => {
														event.preventDefault();
													}}
												/>
												<Button
													type="text"
													danger
													aria-label={t(
														"profile-forms.mentorship.field.openForQuestions.remove",
														"Remove question",
													)}
													icon={<FiTrash2 />}
													onClick={remove}
												/>
											</Flex>
										)}
									/>
								</Form.Item>
							);
						})()}

						<Form.Item
							label={t(
								"profile-forms.mentorship.field.timeForMentoring.label",
								"Query response rate",
							)}
							help={t(
								"profile-forms.mentorship.field.timeForMentoring.help",
								"How quickly do you plan to respond to new requests?",
							)}
							name="timeForMentoring"
						>
							<Input.TextArea
								rows={1}
								placeholder={t(
									"profile-forms.mentorship.field.timeForMentoring.placeholder",
									"I answer as much as possible",
								)}
							/>
						</Form.Item>

						<Button
							type="primary"
							style={{ marginTop: 32 }}
							onClick={handleForm}
							loading={isSaving}
						>
							{t("components.profile-forms.mentorship.card.save", "Save")}
						</Button>
					</Form>
				)}

				{enabled && !specialities?.data.length && (
					<Alert
						message={t(
							"profile-forms.mentorship.card.no-specialities",
							"To become a mentor, you must have at least one specialty of the Experienced or Expert level",
						)}
					/>
				)}
			</Spin>
		</Card>
	);
};

export default MentorshipProfileForm;
