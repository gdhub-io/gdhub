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
	Flex,
	Form,
	Input,
	message,
	Select,
	Space,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { InterestPicker } from "@/components/profile/InterestPicker";
import { resyncSession } from "@/helpers/session";
import actionStyles from "../settingsActions.module.scss";
import styles from "./style.module.scss";

type InterestsProfileFormArgs = {
	profile: Profile & {
		preferredGenres?: GameGenre[];
		preferredSettings?: GameSetting[];
		preferredLevels?: GameDifficultyLevel[];
	};
	saveProfile: (data: Partial<Profile>) => Promise<void>;
};

const { Paragraph } = Typography;

const InterestsProfileForm = ({
	profile,
	saveProfile,
}: InterestsProfileFormArgs) => {
	const [form] = Form.useForm();
	const { update: updateSession } = useSession();
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
			// Used to write `primaryInterest` into the session's `roles` — a wish
			// stored in the field that decided access. Just refresh the session.
			await resyncSession(updateSession);
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
		<>
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
							{/* The same three cards the onboarding asks this with: one
							    question, one control, wherever a person meets it. */}
							<InterestPicker />
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
					</Form>
				</Spin>
			</Card>

			<Flex className={actionStyles.actions}>
				<Button type="primary" onClick={handleForm} loading={processing}>
					{t("Save", "Save")}
				</Button>
			</Flex>
		</>
	);
};

export default InterestsProfileForm;
