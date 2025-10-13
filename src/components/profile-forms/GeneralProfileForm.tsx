import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTolgee } from "@tolgee/react";
import {
	AutoComplete,
	Button,
	Card,
	Flex,
	Form,
	Input,
	message,
	Select,
	Spin,
} from "antd";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import countryList from "react-select-country-list";
import { AvailableLocales } from "@/config/locale";

type GeneralProfileFormArgs = {
	profile: prismaClient.Profile & { user: Partial<prismaClient.User> };
	saveProfile: (data: {
		id: string;
		data: Partial<prismaClient.Profile>;
	}) => Promise<void>;
};

const GeneralProfileForm = ({
	profile,
	saveProfile,
}: GeneralProfileFormArgs) => {
	const [form] = Form.useForm();
	const { t, getLanguage, changeLanguage } = useTolgee();
	const { data: session, update: sessionUpdate } = useSession();
	const [processing, setProcessing] = useState(true);
	const countries = useMemo(() => countryList().getData(), []);

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
			await sessionUpdate({ user: { name: formData.name } });
			await changeLanguage(formData.lang);
			setProcessing(false);

			if (formData.tgNickname) {
				let telegramUsername = formData.tgNickname as string;
				telegramUsername = telegramUsername
					.replace(/@/g, "")
					.replace(/https:\/\/t\.me\//g, "");
				form.setFieldValue("tgNickname", telegramUsername);
			}

			message.success(
				t(
					"profile-forms.general.update-message",
					"Your profile data is updated",
				),
			);
		} catch (error: any) {
			setProcessing(false);
			message.error(error.message);
		}
	};

	return (
		<Spin spinning={processing}>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				name="profile-general-form"
				wrapperCol={{ xs: { span: 24 }, lg: { span: 12 } }}
				onFinish={() => {}}
				onFinishFailed={() => {}}
				autoComplete="off"
				requiredMark="optional"
				initialValues={{
					name: profile.name,
					country: profile.country,
					city: profile.city,
					tgNickname: profile.tgNickname,
					lang: profile?.user.lang || getLanguage(),
				}}
			>
				<Flex vertical gap={16}>
					<Card
						title={t(
							"components.profile-forms.general.card.account",
							"Account",
						)}
						bordered={false}
					>
						<Form.Item
							label={t(
								"components.profile-forms.general.card.account",
								"Display Name",
							)}
							name="name"
							rules={[{ required: true }]}
							required
						>
							<Input />
						</Form.Item>
						<Form.Item
							label={t(
								"components.profile-forms.general.field.email.title",
								"Email",
							)}
							tooltip={{
								title: t(
									"profile-forms.general.field.email.tooltip",
									"Received from your Google account",
								),
							}}
							required
						>
							<Input disabled readOnly value={session?.user?.email || ""} />
						</Form.Item>
						<Form.Item
							label={t(
								"components.profile-forms.general.field.tgNickname.title",
								"Telegram nickname",
							)}
							name="tgNickname"
							extra={t(
								"components.profile-forms.general.field.tgNickname.extra",
								"Indicate without symbol @",
							)}
						>
							<Input />
						</Form.Item>
						<Form.Item
							label={t(
								"components.profile-forms.general.field.language",
								"Platform language",
							)}
							name="lang"
							rules={[{ required: true }]}
						>
							<Select
								defaultValue={getLanguage()}
								options={[
									{ value: AvailableLocales.en, label: "English" },
									{ value: AvailableLocales.ru, label: "Русский" },
								]}
							/>
						</Form.Item>
					</Card>

					<Card
						title={t(
							"components.profile-forms.general.card.location",
							"Location",
						)}
						bordered={false}
					>
						<Form.Item
							label={t(
								"components.profile-forms.general.card.country",
								"Country",
							)}
							name="country"
							rules={[{ required: true }]}
							required
						>
							<AutoComplete
								allowClear
								placeholder={t(
									"components.profile-forms.general.card.country",
									"Country",
								)}
								filterOption={(inputValue, option) =>
									option?.title
										?.toLowerCase()
										.indexOf(inputValue.toLowerCase()) !== -1
								}
							>
								{countries.map(({ value, label }: any) => (
									<AutoComplete.Option key={value} value={label} title={label}>
										{label}
									</AutoComplete.Option>
								))}
							</AutoComplete>
						</Form.Item>
						<Form.Item
							label={t("components.profile-forms.general.card.city", "City")}
							name="city"
							rules={[{ required: false }]}
						>
							<Input />
						</Form.Item>
					</Card>
					<Card bordered={false} styles={{ body: { paddingTop: 0 } }}>
						<Button type="primary" onClick={handleForm} loading={processing}>
							{t("components.profile-forms.general.card.save", "Save")}
						</Button>
					</Card>
				</Flex>
			</Form>
		</Spin>
	);
};

export default GeneralProfileForm;
