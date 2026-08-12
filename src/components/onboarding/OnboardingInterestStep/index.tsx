import type {
	GameDifficultyLevel,
	GameGenre,
	GameSetting,
} from "@gdhub-io/gdhub-prisma";
import { IconAlertCircle } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Flex,
	Form,
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
import { InterestPicker } from "@/components/profile/InterestPicker";
import { PrimaryInterest } from "@/config/prisma-enums";

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
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { data: session } = useSession();

	const forParam = searchParams.get("for");
	const preSelectedInterest = useMemo(() => {
		switch (forParam) {
			case "author":
				return PrimaryInterest.Author;
			case "specialist":
				return PrimaryInterest.Specialist;
			case "mentor":
				return PrimaryInterest.Mentor;
			case "scout":
				return PrimaryInterest.Scout;
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
		queryFn: () => axios.get<GameGenre[]>("/api/dictionary/game-genres"),
		staleTime: Infinity,
	});
	const { data: gameSettings } = useQuery({
		queryKey: ["gameSettings"],
		queryFn: () => axios.get<GameSetting[]>("/api/dictionary/game-settings"),
		staleTime: Infinity,
	});
	const { data: gameLevels } = useQuery({
		queryKey: ["gameLevels"],
		queryFn: () =>
			axios.get<GameDifficultyLevel[]>("/api/dictionary/game-levels"),
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
							<IconAlertCircle
								size={20}
								color="var(--gd-color-text-secondary)"
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
							<InterestPicker />
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
