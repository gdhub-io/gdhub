import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { LuFeather } from "@react-icons/all-files/lu/LuFeather";
import { LuGraduationCap } from "@react-icons/all-files/lu/LuGraduationCap";
import { LuUsers } from "@react-icons/all-files/lu/LuUsers";
import { PiWarningCircleLight } from "@react-icons/all-files/pi/PiWarningCircleLight";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Flex,
	Form,
	Grid,
	Input,
	message,
	Select,
	Space,
	Typography,
} from "antd";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import styles from "./style.module.scss";

interface IOnboardingInterestStep {
	onSave: () => void;
	onPreviousStep: () => void;
}

const { Paragraph, Title, Text } = Typography;

const interestOptions = [
	{
		value: prismaClient.PrimaryInterest.Author,
		icon: LuFeather,
		titleKey: "onboarding.interests.wantToBe.author",
		titleDefault: "Author",
		subtitleKey: "onboarding.interests.author.description",
		subtitleDefault: "I want to collect a team for development of my own game",
	},
	{
		value: prismaClient.PrimaryInterest.Specialist,
		icon: LuUsers,
		titleKey: "onboarding.interests.wantToBe.specialist",
		titleDefault: "Specialist",
		subtitleKey: "onboarding.interests.specialist.description",
		subtitleDefault: "I want to join the team",
	},
	{
		value: prismaClient.PrimaryInterest.Mentor,
		icon: LuGraduationCap,
		titleKey: "onboarding.interests.wantToBe.mentor",
		titleDefault: "Mentor",
		subtitleKey: "onboarding.interests.mentor.description",
		subtitleDefault: "I want to share my expertise",
	},
];

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

	const selectedInterest = Form.useWatch("primaryInterest", form);

	return (
		<div className="onboarding-content">
			<div className="onboarding-form">
				<Space
					direction="vertical"
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
					initialValues={{ primaryInterest: preSelectedInterest }}
				>
					<Space direction="vertical" size={16} style={{ width: "100%" }}>
						<Form.Item
							name="primaryInterest"
							label={t("interest")}
							rules={[{ required: true }]}
						>
							<div
								className={`${styles.interestCards} ${!screens.md ? styles.vertical : ""}`}
							>
								{interestOptions.map((opt) => {
									const isSelected = selectedInterest === opt.value;
									const Icon = opt.icon;
									return (
										<div
											key={opt.value}
											role="button"
											tabIndex={0}
											className={`${styles.card} ${isSelected ? styles.selected : ""}`}
											onClick={() =>
												form.setFieldsValue({ primaryInterest: opt.value })
											}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													form.setFieldsValue({ primaryInterest: opt.value });
												}
											}}
										>
											<div className={styles.cardContent}>
												<div
													className={`${styles.iconCircle} ${isSelected ? styles.selectedIcon : ""}`}
												>
													<Icon size={28} />
												</div>
												<div className={styles.cardTitle}>
													<span>
														{t(
															"onboarding.interests.wantToBe.text",
															"I want to be",
														)}
													</span>
													<strong>{t(opt.titleKey, opt.titleDefault)}</strong>
												</div>
											</div>
											<div
												className={`${styles.cardFooter} ${isSelected ? styles.selectedFooter : ""}`}
											>
												{t(opt.subtitleKey, opt.subtitleDefault)}
											</div>
										</div>
									);
								})}
							</div>
						</Form.Item>

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

						<Form.Item name="preferredGenres" label={t("form.genres.label")}>
							<Select
								options={prepareOptions(gameGenres?.data)}
								mode="multiple"
								allowClear
								style={{ width: "100%" }}
								placeholder={t("select")}
							/>
						</Form.Item>

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
							/>
						</Form.Item>

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
							/>
						</Form.Item>
					</Space>
				</Form>
			</div>
			<div className="onboarding-footer">
				<Button onClick={onPreviousStep}>
					{t("onboarding.interests.back", "Back")}
				</Button>
				<Button
					type="primary"
					onClick={handleSave}
					loading={isUpdatingInterests}
				>
					{t("onboarding.interests.saveAndContinue", "Save and continue")}
				</Button>
			</div>
		</div>
	);
};
