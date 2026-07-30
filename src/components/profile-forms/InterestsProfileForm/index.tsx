import type {
	GameDifficultyLevel,
	GameGenre,
	GameSetting,
	Profile,
} from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Form,
	Grid,
	Input,
	message,
	Radio,
	Segmented,
	Select,
	Space,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import InterestAuthorIcon from "@/assets/images/icons/interest-author-icon.svg";
import InterestMentorIcon from "@/assets/images/icons/interest-mentor-icon.svg";
import InterestSpecialistIcon from "@/assets/images/icons/interest-specialist-icon.svg";
import { PrimaryInterest } from "@/config/prisma-enums";
import styles from "./style.module.scss";

type InterestsProfileFormArgs = {
	profile: Profile & {
		preferredGenres?: GameGenre[];
		preferredSettings?: GameSetting[];
		preferredLevels?: GameDifficultyLevel[];
	};
	saveProfile: (data: Partial<Profile>) => Promise<void>;
};

const { Paragraph, Text } = Typography;

const InterestsProfileForm = ({
	profile,
	saveProfile,
}: InterestsProfileFormArgs) => {
	const [form] = Form.useForm();
	const { update: updateSession } = useSession();
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();
	const [processing, setProcessing] = useState(true);
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

	useEffect(() => {
		if (profile) {
			setProcessing(false);
		}
	}, [profile]);

	const handleForm = async () => {
		try {
			const formData = await form.validateFields();

			setProcessing(true);
			await saveProfile(formData);
			await updateSession({ user: { roles: [formData.primaryInterest] } });
			setProcessing(false);

			message.success(
				t(
					"Interests and preferences updated",
					"Interests and preferences updated",
				),
			);
		} catch (error: any) {
			setProcessing(false);
			message.error(error.message);
		}
	};

	const gameGenresOptions = gameGenres?.data.map((i) => ({
		label: (
			<Typography.Text ellipsis>
				{t(`gameGenres.${i.name}`, i.name)}
			</Typography.Text>
		),
		value: i.id,
	}));

	const graphicSettingsOptions = gameSettings?.data.map((i) => ({
		label: (
			<Typography.Text ellipsis>
				{t(`gameSettings.${i.name}`, i.name)}
			</Typography.Text>
		),
		value: i.id,
	}));

	const gameLevelsOptions = gameLevels?.data.map((i) => ({
		label: (
			<Typography.Text ellipsis>
				{t(`gameLevels.${i.name}`, i.name)}
			</Typography.Text>
		),
		value: i.id,
	}));

	return (
		<Card
			title={t("Interests and preferences")}
			className={styles.content}
			bordered={false}
		>
			<Spin spinning={processing}>
				<Paragraph>
					{t(
						"interestsAndPreferencesDescription",
						"This information will help us more accurately configure recommendations on projects, candidates for projects for you.",
					)}
				</Paragraph>

				<Form
					form={form}
					layout="vertical"
					variant="filled"
					name="profile-preferences-form"
					wrapperCol={{ span: 24 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						motivation: profile?.motivation,
						primaryInterest: profile?.primaryInterest,
						preferredGenres: profile?.preferredGenres?.map((d) => d.id) || [],
						preferredSettings:
							profile?.preferredSettings?.map((d) => d.id) || [],
						preferredLevels: profile?.preferredLevels?.map((d) => d.id) || [],
					}}
				>
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
														{t("wantToBe.text", "I want to be")}{" "}
														<Text italic>{t("Author", "Author")}</Text>
													</Paragraph>
												</div>
												<div className="segmented-option-footer">
													<Text>
														{t(
															"wantToBe.author.description",
															"I want to create my own games",
														)}
													</Text>
												</div>
											</div>
										),
										value: PrimaryInterest.Author,
									},
									{
										label: (
											<div className={styles.segmentedOption}>
												<div className="segmented-option-content">
													<InterestSpecialistIcon height={56} width={56} />
													<Paragraph>
														{t("wantToBe.text", "I want to be")}{" "}
														<Text italic>{t("Specialist", "Specialist")}</Text>
													</Paragraph>
												</div>
												<div className="segmented-option-footer">
													<Text>
														{t(
															"wantToBe.specialist.description",
															"I want to join the team",
														)}
													</Text>
												</div>
											</div>
										),
										value: PrimaryInterest.Specialist,
									},
									{
										label: (
											<div className={styles.segmentedOption}>
												<div className="segmented-option-content">
													<InterestMentorIcon height={56} width={56} />
													<Paragraph>
														{t("wantToBe.text", "I want to be")}{" "}
														<Text italic>{t("Mentor", "Mentor")}</Text>
													</Paragraph>
												</div>
												<div className="segmented-option-footer">
													<Text>
														{t(
															"wantToBe.mentor.description",
															"I want to share my expertise",
														)}
													</Text>
												</div>
											</div>
										),
										value: PrimaryInterest.Mentor,
									},
								]}
							/>
						)}

						{!screens.lg && (
							<Radio.Group>
								<Space orientation="vertical">
									<Radio value={PrimaryInterest.Author}>
										{t("wantToBe.text", "I want to be")}{" "}
										<Text italic>{t("Author", "Author")}</Text>
									</Radio>
									<Radio value={PrimaryInterest.Specialist}>
										{t("wantToBe.text", "I want to be")}{" "}
										<Text italic>{t("Specialist", "Specialist")}</Text>
									</Radio>
									<Radio value={PrimaryInterest.Mentor}>
										{t("wantToBe.text", "I want to be")}{" "}
										<Text italic>{t("Mentor", "Mentor")}</Text>
									</Radio>
								</Space>
							</Radio.Group>
						)}
					</Form.Item>
					<Form.Item
						label={t(
							"profile-forms.interests.field.motivation.label",
							"Your motivation for participation in projects or in their creation",
						)}
						name="motivation"
					>
						<Input.TextArea rows={4} />
					</Form.Item>
					<Form.Item
						label={t(
							"profile-forms.interests.field.preferredGenres.label",
							"Games genres in the development of which you would be interested to participate",
						)}
						name="preferredGenres"
					>
						<Select
							options={gameGenresOptions}
							mode="multiple"
							allowClear
							style={{ width: "100%" }}
							placeholder={t("Select")}
							onChange={() => {}}
						/>
					</Form.Item>
					<Form.Item
						label={t(
							"profile-forms.interests.field.preferredSettings.label",
							"Visual setting of projects with which you would be interested to work",
						)}
						name="preferredSettings"
					>
						<Select
							options={graphicSettingsOptions}
							mode="multiple"
							allowClear
							style={{ width: "100%" }}
							placeholder={t("Select")}
							onChange={() => {}}
						/>
					</Form.Item>
					<Form.Item
						label={t(
							"profile-forms.interests.field.preferredLevels.label",
							"What complexity games you would like to develop",
						)}
						name="preferredLevels"
					>
						<Select
							options={gameLevelsOptions}
							mode="multiple"
							allowClear
							style={{ width: "100%" }}
							placeholder={t("Select")}
							onChange={() => {}}
						/>
					</Form.Item>

					<Button type="primary" onClick={handleForm} loading={processing}>
						{t("Save", "Save")}
					</Button>
				</Form>
			</Spin>
		</Card>
	);
};

export default InterestsProfileForm;
