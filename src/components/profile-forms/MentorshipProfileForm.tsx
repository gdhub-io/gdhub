import type { Profile } from "@gdhub-io/gdhub-prisma";
import {
	IconArrowRight,
	IconArrowUpRight,
	IconFileCheck,
	IconFileText,
	IconLock,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	Button,
	Card,
	Divider,
	Flex,
	Form,
	Input,
	message,
	Skeleton,
	Space,
	Spin,
	Switch,
	Typography,
} from "antd";
import Select from "antd/es/select";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
	legalAcceptances,
	outdatedLegalCode,
} from "@/components/legal/ClickwrapField";
import { LegalAcceptModal } from "@/components/legal/LegalAcceptModal";
import { DynamicRowList } from "@/components/shared/DynamicRowList";
import { IconTile, LoadError } from "@/components/ui";
import { resyncSession } from "@/helpers/session";
import { EXPERT_SKILL_LEVELS } from "@/helpers/speciality";
import type { LegalAcceptanceInput } from "@/lib/legal/accept";
import styles from "./MentorshipProfileForm.module.scss";
import { SettingsActions } from "./SettingsActions";

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

	// Read from the server, not from the session: the JWT lags by minutes, so a
	// switch driven by it shows the previous answer after a save or a reload.
	const {
		data: mentorship,
		refetch: refetchMentorship,
		// Without the saved setting the switch would read "off" and saving would turn mentorship off.
		isLoadingError: mentorshipFailed,
		isPending: isMentorshipPending,
	} = useQuery({
		queryKey: ["user-mentorship"],
		queryFn: () =>
			axios
				.get<{
					enabled: boolean;
					agreementPublished: boolean;
					agreementAccepted: boolean;
					agreement: { version: number; acceptedAt: string } | null;
				}>("/api/user/profile/mentorship")
				.then((response) => response.data),
	});

	const savedEnabled = mentorship?.enabled ?? false;
	const needsAgreement = mentorship?.agreementAccepted === false;
	const [agreementStale, setAgreementStale] = useState(false);
	const [agreementOpen, setAgreementOpen] = useState(false);
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
				legal?: LegalAcceptanceInput[];
			}) => axios.put<any>("/api/user/profile/mentorship", data),
			onSuccess: async () => {
				await refetchSpecialityList();
			},
		});

	const {
		data: specialities,
		isLoading: isSpecialityFetching,
		isLoadingError: isSpecialitiesFailed,
		refetch: refetchSpecialityList,
		dataUpdatedAt,
	} = useQuery({
		queryKey: ["user-specialities", "mentorship"],
		queryFn: () =>
			axios.get<any>("/api/user/specialities", {
				params: {
					level: EXPERT_SKILL_LEVELS,
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

	// `agreed`: the box was ticked in the agreement modal just now.
	const handleForm = async (agreed = false) => {
		if (enabled && needsAgreement && !agreed) {
			setAgreementOpen(true);
			return;
		}
		try {
			// Turning mentorship off is a valid save on its own — there is nothing to
			// fill in, so the fields are only validated when it stays on.
			const data = enabled ? await form.validateFields() : {};

			setAgreementStale(false);
			await saveMentorshipSetting({
				...data,
				enabled,
				...(enabled && needsAgreement
					? { legal: legalAcceptances(["AdvisorAgreement"]) }
					: {}),
			});
			// The draft stays as the source of truth for the switch. `update()`
			// returns before the session object in the hook is replaced, so falling
			// back to the session here would show the pre-save value for a moment —
			// which is exactly what looked like the switch turning itself back on.
			await refetchMentorship();
			// Other parts of the app still read the role from the session.
			await resyncSession(refreshSession);
			await onUpdate();

			message.success(
				t(
					"profile-forms.mentorship.update-message",
					"Mentorship settins is updated",
				),
			);
		} catch (error) {
			if (outdatedLegalCode(error)) {
				setAgreementStale(true);
				setAgreementOpen(true);
			}
		}
	};

	const switchMentorshipStatus = (checked: boolean) => {
		setDraftEnabled(checked);

		if (!checked) {
			form.resetFields();
			setSelectedSpecialityId(null);
		}
	};

	const agreement = mentorship?.agreement;
	const accepted = mentorship?.agreementAccepted === true;

	// Frames `ep5EM` / `isYQT`: where the agreement stands, and the way into the space.
	const agreementRows = (
		<div className={styles.agreement}>
			{mentorship?.agreementPublished && (
				<>
					<Flex align="center" gap={12}>
						{accepted && agreement ? (
							<>
								<IconTile
									icon={IconFileCheck}
									tint="var(--gd-success-tint)"
									ink="var(--gd-success-on-tint)"
								/>
								<Flex vertical className={styles.rowText}>
									<Text className={styles.rowTitle}>
										{t(
											"profile-forms.mentorship.agreement.accepted",
											"Advisor Agreement accepted",
										)}
									</Text>
									<Text className={styles.rowMeta}>
										{t(
											"profile-forms.mentorship.agreement.accepted-on",
											"Accepted on {date} · version {version}",
											{
												date: dayjs(agreement.acceptedAt).format("D MMM YYYY"),
												version: agreement.version,
											},
										)}
									</Text>
								</Flex>
								<Link
									href={`/legal/advisor-agreement/v${agreement.version}`}
									target="_blank"
								>
									<Button
										icon={<IconArrowUpRight size={16} />}
										iconPlacement="end"
									>
										{t(
											"profile-forms.mentorship.agreement.view",
											"View document",
										)}
									</Button>
								</Link>
							</>
						) : (
							<>
								<IconTile
									icon={IconFileText}
									tint="var(--gd-warning-tint)"
									ink="var(--gd-warning-on-tint)"
								/>
								<Text className={`${styles.rowText} ${styles.rowTitle}`}>
									{t(
										"profile-forms.mentorship.agreement.missing",
										"Advisor Agreement not accepted",
									)}
								</Text>
								<Button type="primary" onClick={() => setAgreementOpen(true)}>
									{t(
										"profile-forms.mentorship.agreement.read",
										"Read and accept",
									)}
								</Button>
							</>
						)}
					</Flex>
					<Divider className={styles.divider} />
				</>
			)}
			<Flex align="center" gap={12}>
				<Text
					className={`${styles.rowText} ${styles.rowTitle}`}
					type={accepted && savedEnabled ? undefined : "secondary"}
				>
					{t("profile-forms.mentorship.space", "Advisor space")}
				</Text>
				{accepted && savedEnabled ? (
					<Link href="/advisor">
						<Button icon={<IconArrowRight size={16} />} iconPlacement="end">
							{t("profile-forms.mentorship.space.open", "Open advisor space")}
						</Button>
					</Link>
				) : (
					<Button disabled icon={<IconLock size={16} />}>
						{t("profile-forms.mentorship.space.open", "Open advisor space")}
					</Button>
				)}
			</Flex>
		</div>
	);

	const specialitiesFailed = enabled && isSpecialitiesFailed;
	const loadErrorTitle = t(
		"profile-forms.mentorship.load-error",
		"Mentorship settings could not be loaded",
	);

	const specialityListOptions = specialities?.data.map((r: any) => ({
		label: t(`components.profile-forms.mentorship.card.${r.name}`, r.name),
		value: r.id,
	}));

	return (
		<>
			<Card
				title={t(
					"components.profile-forms.mentorship.card.title",
					"Mentorship",
				)}
				variant="borderless"
				extra={
					!mentorshipFailed && (
						<Space size={8}>
							<Text type="secondary">
								{t(
									"components.profile-forms.mentorship.availability",
									"Available for advice",
								)}
							</Text>
							{/* No tooltip on the switch: the label beside it already says what
					    the setting does, and hovering a control to find out what it
					    controls is the worst place to hide an explanation. */}
							{isMentorshipPending ? (
								<Skeleton.Button active size="small" shape="round" />
							) : (
								<Switch
									checked={enabled}
									loading={isSaving}
									onChange={switchMentorshipStatus}
								/>
							)}
						</Space>
					)
				}
			>
				<Spin spinning={isSaving}>
					<Paragraph>
						{t(
							"components.profile-forms.mentorship.card.description",
							"Allows you to contribute to game development through advising",
						)}
					</Paragraph>
					{(mentorshipFailed || specialitiesFailed) && (
						<LoadError
							title={loadErrorTitle}
							onRetry={() => {
								if (mentorshipFailed) refetchMentorship();
								if (specialitiesFailed) refetchSpecialityList();
							}}
						/>
					)}
					{enabled && agreementRows}
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
														icon={<IconTrash />}
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
						</Form>
					)}

					{enabled && !specialitiesFailed && !specialities?.data.length && (
						<Alert
							title={t(
								"profile-forms.mentorship.card.no-specialities",
								"To become a mentor, you must have at least one specialty of the Experienced or Expert level",
							)}
						/>
					)}
				</Spin>
			</Card>

			{!mentorshipFailed && !specialitiesFailed && (
				<SettingsActions onSave={() => handleForm()} loading={isSaving} />
			)}

			<LegalAcceptModal
				code="AdvisorAgreement"
				open={agreementOpen}
				stale={agreementStale}
				okText={t(
					"profile-forms.mentorship.agreement.accept",
					"Accept and turn on",
				)}
				requiredMessage={t(
					"legal.clickwrap.AdvisorAgreement.required",
					"You need to accept the Advisor Agreement to turn on the advisor space",
				)}
				onCancel={() => setAgreementOpen(false)}
				onAccept={() => {
					setAgreementOpen(false);
					handleForm(true);
				}}
			/>
		</>
	);
};

export default MentorshipProfileForm;
