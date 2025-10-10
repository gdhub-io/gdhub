import { FiChevronDown } from "@react-icons/all-files/fi/FiChevronDown";
import { GoInfo } from "@react-icons/all-files/go/GoInfo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	AutoComplete,
	Button,
	Checkbox,
	Col,
	Form,
	Input,
	message,
	notification,
	Row,
	Select,
	Space,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import countryList from "react-select-country-list";
import { deleteCookie, getCookie } from "@/helpers/cookie";

interface IOnboardingProfileStep {
	onSave: (params: { userId: string }) => void;
	onLoading: (response: Record<string, any>) => void;
}

const { Paragraph, Title } = Typography;

export const OnboardingProfileStep = ({ onSave, onLoading = () => {} }: IOnboardingProfileStep) => {
	const router = useRouter();
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { data: session } = useSession();
	const countries = useMemo(() => countryList().getData(), []);

	const {
		data: profileData,
		isLoading,
		isFetched,
	} = useQuery({
		queryKey: ["profile", session?.user.id],
		queryFn: () => axios.get<any>("/api/auth/registration/onboarding/profile"),
		enabled: !!session?.user.id,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (!isFetched) return;

		if (!profileData?.data) return;

		const { data } = profileData;

		const [firstName, lastName] = data.name.split(" ");
		form.setFieldsValue({
			firstName,
			lastName,
			yearOfBirth: data.yearOfBirth,
			country: data.country,
			city: data.city,
			confirmUserData: data.user.agreements.confirmUserData,
		});

		onLoading(data);
	}, [profileData?.data]);

	const { mutateAsync: saveUserProfile, isPending: isSaving } = useMutation({
		mutationFn: (data: any) => axios.put<any>("/api/auth/registration/onboarding/profile", data),
	});

	const yearOptions = useMemo(
		() =>
			new Array(84).fill(0).map((r, i) => {
				const _year = dayjs().year() - i - 16;
				return { label: _year, value: _year };
			}),
		[],
	);

	const handleSaveProfileAndNextStep = async () => {
		try {
			const { firstName, lastName, ...data } = await form.validateFields();
			let preRegistrationData: Record<string, any> | undefined;

			if (router.query.provider) {
				const preRegistrationCookie = getCookie(`auth.${router.query.provider}.pre-registration`);
				preRegistrationData = preRegistrationCookie ? JSON.parse(preRegistrationCookie) : undefined;
			}

			const res = await saveUserProfile({
				...data,
				name: [firstName, lastName].join(" "),
				agreeWithTermsAndPrivacy: preRegistrationData?.agreeWithTermsAndPrivacy,
				needSubscribeToNewsletter: preRegistrationData?.needSubscribeToNewsletter,
			});

			deleteCookie(`auth.${router.query.provider}.pre-registration`);

			onSave({ userId: res.data.id });
		} catch (error: any) {
			if (!error.response || !error.message) return;

			message.error(error.response?.data?.message || error.message);
		}
	};

	return (
		<Spin spinning={isLoading && !isFetched}>
			<div className="onboarding-content">
				<div className="onboarding-form">
					<div className="onboarding-form-title">
						<Title level={2}>{t("onboarding.profile.title", "User Profile")}</Title>
						<Paragraph italic>
							{t("onboarding.profile.description", "General information about new member")}
						</Paragraph>
					</div>

					<Form
						form={form}
						layout="vertical"
						variant="filled"
						requiredMark="optional"
						autoComplete="off"
						scrollToFirstError
						initialValues={{ registrationToken: router.query.token as string }}
					>
						<Space direction="vertical" size={16} style={{ width: "100%" }}>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={12}>
									<Form.Item name="firstName" label={t("firstName")} rules={[{ required: true }]}>
										<Input
											placeholder={t("onboarding.profile.firstName.placeholder", "First name")}
										/>
									</Form.Item>
								</Col>
								<Col xs={24} lg={12}>
									<Form.Item name="lastName" label={t("lastName")} rules={[{ required: true }]}>
										<Input
											placeholder={t("onboarding.profile.lastName.placeholder", "Last name")}
										/>
									</Form.Item>
								</Col>
								<Col xs={24} lg={12}>
									<Form.Item label={t("email")} required rules={[{ required: true }]}>
										<Input
											value={session?.user.email || undefined}
											placeholder={t("onboarding.profile.email.placeholder", "Email")}
											disabled
											readOnly
										/>
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={12}>
									<Form.Item
										name="yearOfBirth"
										label={t("yearOfBirth")}
										rules={[{ required: true }]}
										tooltip={{
											icon: <GoInfo />,
											title: t(
												"onboarding.profile.yearOfBirth.tooltip",
												"You should not be younger than 16 years",
											),
										}}
									>
										<Select
											options={yearOptions}
											showSearch
											placeholder={dayjs().subtract(16, "years").year()}
										/>
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={[32, 16]}>
								<Col xs={24} lg={12}>
									<Form.Item name="country" label={t("country")} rules={[{ required: true }]}>
										<AutoComplete
											allowClear
											placeholder={t("country.placeholder", "Select country")}
											suffixIcon={<FiChevronDown size={24} color="#afafaf" />}
											filterOption={(inputValue, option) =>
												option?.title?.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
											}
										>
											{countries.map(({ value, label }: any) => (
												<AutoComplete.Option key={value} value={label} title={label}>
													{label}
												</AutoComplete.Option>
											))}
										</AutoComplete>
									</Form.Item>
								</Col>
								<Col xs={24} lg={12}>
									<Form.Item name="city" label={t("city")}>
										<Input placeholder={t("onboarding.profile.city.placeholder", "City")} />
									</Form.Item>
								</Col>
							</Row>

							<Form.Item
								name="confirmUserData"
								valuePropName="checked"
								noStyle
								rules={[
									{
										validator: (_, value) => {
											if (!value) {
												notification.error({
													message: t(
														"confirmUserData.error",
														"You should confirm the accuracy of the information entered",
													),
												});
											}
											return value ? Promise.resolve() : Promise.reject();
										},
									},
								]}
							>
								<Checkbox>
									{t(
										"onboarding.profile.confirmUserData",
										"I confirm the accuracy of the information entered",
									)}
								</Checkbox>
							</Form.Item>
						</Space>
					</Form>
				</div>
				<div className="onboarding-footer">
					<span></span>
					<Button type="primary" onClick={handleSaveProfileAndNextStep} loading={isSaving}>
						{t("onboarding.profile.saveAndContinue", "Save and continue")}
					</Button>
				</div>
			</div>
		</Spin>
	);
};
