import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { PiWarningCircleLight } from "@react-icons/all-files/pi/PiWarningCircleLight";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Col,
	Flex,
	Form,
	Grid,
	Input,
	message,
	Radio,
	Row,
	Segmented,
	Select,
	Space,
	Typography,
} from "antd";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import InterestAuthorIcon from "@/assets/images/icons/interest-author-icon.svg";
import InterestMentorIcon from "@/assets/images/icons/interest-mentor-icon.svg";
import InterestSpecialistIcon from "@/assets/images/icons/interest-specialist-icon.svg";
import styles from "./style.module.scss";

interface IOnboardingInterestStep {
	onSave: () => void;
	onPreviousStep: () => void;
}

const { Paragraph, Title, Text } = Typography;

export const OnboardingInterestStep = ({
	onSave,
	onPreviousStep = () => {},
}: IOnboardingInterestStep) => {
	const searchParams = useSearchParams();
	const screens = Grid.useBreakpoint();
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { data: session } = useSession();

	const forParam = searchParams.get("for");
	const preSelectedInterest = useMemo(() => {
		switch (forParam) {
			case "author":
				return prismaClient.PrimaryInterest.Author;
			case "specialist":
				return prismaClient.PrimaryInterest.Specialist;
			case "mentor":
				return prismaClient.PrimaryInterest.Mentor;
			default:
				return undefined;
		}
	}, [forParam]);

	const { data: profileData } = useQuery({
		queryKey: ["profile", session?.user.id],
		queryFn: () => axios.get<any>("/api/auth/registration/onboarding/interest"),
		enabled: !!session?.user.id,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (profileData?.data) {
			form.setFieldsValue({
				primaryInterest:
					preSelectedInterest || profileData.data.primaryInterest,
			});
		}
	}, [profileData?.data]);

	const { data: gameGenres } = useQuery({
		queryKey: ["gameGenres"],
		queryFn: () =>
			axios.get<prismaClient.GameGenre[]>("/api/dictionary/game-genres"),
		staleTime: Infinity,
	});
	const { data: gameSettings } = useQuery({
		queryKey: ["gameSettings"],
		queryFn: () =>
			axios.get<prismaClient.GameSetting[]>("/api/dictionary/game-settings"),
		staleTime: Infinity,
	});
	const { data: gameLevels } = useQuery({
		queryKey: ["gameLevels"],
		queryFn: () =>
			axios.get<prismaClient.GameDifficultyLevel[]>(
				"/api/dictionary/game-levels",
			),
		staleTime: Infinity,
	});

	const { mutateAsync: updateProfile, isPending: isUpdatingInterests } =
		useMutation({
			mutationFn: ({ data }: any) =>
				axios.put<any>("/api/auth/registration/onboarding/interest", data),
		});

	const prepareOptions = (data?: any[]) => {
		if (!data) return [];

		return data.map((i) => ({
			label: (
				<Typography.Text ellipsis>
					{t(`onboarding.interests.gameGenres.${i.name}`, i.name)}
				</Typography.Text>
			),
			value: i.id,
		}));
	};

	const handleSave = async () => {
		try {
			const data = await form.validateFields();

			await updateProfile({ data });

			onSave();
		} catch (error: any) {
			if (!error.response || !error.message) return;

			message.error(error.response?.data?.message || error.message);
		}
	};

	return (
		<div className={styles.content}>
			<div className="onboarding-content">
				<div className="onboarding-form">
					<Space
						orientation="vertical"
						className="onboarding-form-title"
						style={{ width: "100%" }}
					>
						<Flex justify="space-between" align="center" wrap="wrap">
							<Title level={2}>
								{t("onboarding.interests.title", "Interests")}
							</Title>
							<Flex align="center" gap={4}>
								<PiWarningCircleLight
									size={20}
									color="#05050573"
									style={{ height: 20 }}
								/>
								<Text type="secondary" italic>
									{t(
										"onboarding.interests.youCanChangeItOrAddMoreOnesAfter",
										"You can change it or add more ones after",
									)}
								</Text>
							</Flex>
						</Flex>

						<Paragraph italic>
							{t(
								"onboarding.interests.motivation.description",
								"Information about your motivations and preferences. This information will allow the platform to suggest you the most suitable projects, vacancies or candidates for your project.",
							)}
						</Paragraph>
					</Space>

					<Form
						form={form}
						layout="vertical"
						variant="filled"
						requiredMark="optional"
						autoComplete="off"
						scrollToFirstError
						onValuesChange={(a, b) => console.log("change", a, b)}
						initialValues={{ primaryInterest: preSelectedInterest }}
					>
						<Space orientation="vertical" size={16} style={{ width: "100%" }}>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={24}>
									<Form.Item
										name="primaryInterest"
										label={t("interest")}
										rules={[{ required: true }]}
									>
										{screens.lg && (
											<Segmented
												block
												className={styles.interest}
												options={[
													{
														label: (
															<div className={styles.segmentedOption}>
																<div className="segmented-option-content">
																	<InterestAuthorIcon height={56} width={56} />
																	<Paragraph>
																		{t(
																			"onboarding.interests.wantToBe.text",
																			"I want to be",
																		)}{" "}
																		<Text italic>Author</Text>
																	</Paragraph>
																</div>
																<div className="segmented-option-footer">
																	<Text>I want to create games for myself</Text>
																</div>
															</div>
														),
														value: prismaClient.PrimaryInterest.Author,
													},
													{
														label: (
															<div className={styles.segmentedOption}>
																<div className="segmented-option-content">
																	<InterestSpecialistIcon
																		height={56}
																		width={56}
																	/>
																	<Paragraph>
																		{t(
																			"onboarding.interests.wantToBe.text",
																			"I want to be",
																		)}{" "}
																		<Text italic>Specialist</Text>
																	</Paragraph>
																</div>
																<div className="segmented-option-footer">
																	<Text>I want to join the team</Text>
																</div>
															</div>
														),
														value: prismaClient.PrimaryInterest.Specialist,
													},
													{
														label: (
															<div className={styles.segmentedOption}>
																<div className="segmented-option-content">
																	<InterestMentorIcon height={56} width={56} />
																	<Paragraph>
																		{t(
																			"onboarding.interests.wantToBe.text",
																			"I want to be",
																		)}{" "}
																		<Text italic>Mentor</Text>
																	</Paragraph>
																</div>
																<div className="segmented-option-footer">
																	<Text>I want to share my expertise</Text>
																</div>
															</div>
														),
														value: prismaClient.PrimaryInterest.Mentor,
													},
												]}
											/>
										)}

										{!screens.lg && (
											<Radio.Group>
												<Space orientation="vertical">
													<Radio value={prismaClient.PrimaryInterest.Author}>
														{t(
															"onboarding.interests.wantToBe.text",
															"I want to be",
														)}{" "}
														<Text italic>
															{t(
																"onboarding.interests.wantToBe.author",
																"Author",
															)}
														</Text>
													</Radio>
													<Radio
														value={prismaClient.PrimaryInterest.Specialist}
													>
														{t(
															"onboarding.interests.wantToBe.text",
															"I want to be",
														)}{" "}
														<Text italic>
															{t(
																"onboarding.interests.wantToBe.specialist",
																"Specialist",
															)}
														</Text>
													</Radio>
													<Radio value={prismaClient.PrimaryInterest.Mentor}>
														{t(
															"onboarding.interests.wantToBe.text",
															"I want to be",
														)}{" "}
														<Text italic>
															{t(
																"onboarding.interests.wantToBe.mentor",
																"Mentor",
															)}
														</Text>
													</Radio>
												</Space>
											</Radio.Group>
										)}
									</Form.Item>
								</Col>
							</Row>

							<Form.Item
								name="motivation"
								label={t(
									"form.motivation.label",
									"Your motivation. Why do you want to participate in game development or create your own?",
								)}
								wrapperCol={{ span: 24 }}
							>
								<Input.TextArea
									rows={4}
									placeholder={t(
										"form.motivation.placeholder",
										"Example: I want to be part of the creative team. What attracts me to game development...",
									)}
								/>
							</Form.Item>

							<Row>
								<Col xs={24} lg={24}>
									<Form.Item
										name="preferredGenres"
										label={t("form.genres.label")}
									>
										<Select
											options={prepareOptions(gameGenres?.data)}
											mode="multiple"
											allowClear
											style={{ width: "100%" }}
											placeholder={t("select")}
											onChange={() => {}}
										/>
									</Form.Item>
								</Col>
							</Row>

							<Row>
								<Col xs={24} lg={24}>
									<Form.Item
										name="preferredSettings"
										label={t("form.settings.label")}
									>
										<Select
											options={prepareOptions(gameSettings?.data)}
											mode="multiple"
											allowClear
											style={{ width: "100%" }}
											placeholder={t("select")}
											onChange={() => {}}
										/>
									</Form.Item>
								</Col>
							</Row>
							<Row>
								<Col xs={24} lg={24}>
									<Form.Item
										name="preferredLevels"
										label={t("form.difficulty.label")}
									>
										<Select
											options={prepareOptions(gameLevels?.data)}
											mode="multiple"
											allowClear
											style={{ width: "100%" }}
											placeholder={t("select")}
											onChange={() => {}}
										/>
									</Form.Item>
								</Col>
							</Row>
						</Space>
					</Form>
				</div>
				<Space
					className="onboarding-footer"
					wrap
					size={16}
					style={
						screens.lg
							? { flexDirection: "row" }
							: { flexDirection: "column-reverse" }
					}
				>
					<Button onClick={onPreviousStep}>
						{t("onboarding.interests.back", "Back")}
					</Button>
					<Space>
						{/* <Button type="text" onClick={() => router.push('/hub')}>
							{t('onboarding.interests.continueLater', 'Continue later')}
						</Button> */}
						<Button
							type="primary"
							onClick={handleSave}
							loading={isUpdatingInterests}
						>
							{t("onboarding.interests.saveAndContinue", "Save and continue")}
						</Button>
					</Space>
				</Space>
			</div>
		</div>
	);
};
