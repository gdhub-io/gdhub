import type { Profile } from "@gdhub-io/gdhub-prisma";
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
import { SkillLevel } from "@/config/prisma-enums";

const { Paragraph, Text } = Typography;

type MentorshipProfileFormArgs = {
	profile: Profile;
	onUpdate: () => Promise<void> | void;
};

const MentorshipProfileForm = ({
	profile,
	onUpdate = () => {},
}: MentorshipProfileFormArgs) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const [selectedSpecialityId, setSelectedSpecialityId] = useState<
		string | null
	>(null);
	const { update: refreshSession } = useSession();
	const maxQuestions = 5;
	const openForQuestions =
		Form.useWatch<string[]>("openForQuestions", form) ?? [];

	/**
	 * The switch is a draft until the form is saved: turning mentorship on
	 * without saying what you can help with is not an offer of anything, so it
	 * must not reach the server on its own.
	 *
	 * `null` means untouched — the switch shows what the server has. Once the
	 * user flips it, their choice wins until they save, and syncing from the
	 * session cannot flip it back under their hands.
	 */
	const [draftEnabled, setDraftEnabled] = useState<boolean | null>(null);
	const [isDirty, setIsDirty] = useState(false);

	// Read from the server, not from the session: the JWT lags by minutes, so a
	// switch driven by it shows the previous answer after a save or a reload.
	const { data: mentorship, refetch: refetchMentorship } = useQuery({
		queryKey: ["user-mentorship"],
		queryFn: () =>
			axios
				.get<{ enabled: boolean }>("/api/user/profile/mentorship")
				.then((response) => response.data),
	});

	const savedEnabled = mentorship?.enabled ?? false;
	const enabled = draftEnabled ?? savedEnabled;

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
				enabled: boolean;
				specialityId?: string;
				timeForMentoring?: string;
				openForQuestions?: string[];
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
					level: [SkillLevel.Experienced, SkillLevel.Expert],
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
			// Turning mentorship off is a valid save on its own — there is nothing to
			// fill in, so the fields are only validated when it stays on.
			const data = enabled ? await form.validateFields() : {};

			await saveMentorshipSetting({ ...data, enabled });
			// The draft stays as the source of truth for the switch. `update()`
			// returns before the session object in the hook is replaced, so falling
			// back to the session here would show the pre-save value for a moment —
			// which is exactly what looked like the switch turning itself back on.
			setIsDirty(false);
			await refetchMentorship();
			// Other parts of the app still read the role from the session.
			await refreshSession();
			await onUpdate();

			message.success(
				t(
					"profile-forms.mentorship.update-message",
					"Mentorship settins is updated",
				),
			);
		} catch {}
	};

	const switchMentorshipStatus = (checked: boolean) => {
		setDraftEnabled(checked);
		setIsDirty(true);

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
						loading={isSaving}
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
						title={t(
							"profile-forms.mentorship.card.no-specialities",
							"To become a mentor, you must have at least one specialty of the Experienced or Expert level",
						)}
					/>
				)}

				{/* Switching off hides the form, and with it the Save button — the
				    choice still has to be confirmed, so it gets its own. */}
				{!enabled && isDirty && (
					<Button
						type="primary"
						style={{ marginTop: 16 }}
						onClick={handleForm}
						loading={isSaving}
					>
						{t("components.profile-forms.mentorship.card.save", "Save")}
					</Button>
				)}
			</Spin>
		</Card>
	);
};

export default MentorshipProfileForm;
