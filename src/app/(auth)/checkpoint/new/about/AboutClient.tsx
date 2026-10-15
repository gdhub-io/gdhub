"use client";

import { useTranslate } from "@tolgee/react";
import {
	App,
	AutoComplete,
	Button,
	Col,
	Form,
	Input,
	Row,
	Select,
	Skeleton,
} from "antd";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import countryList from "react-select-country-list";
import { ENTRY_HUB_HREF } from "@/components/checkpoints/entry/EntryHub";
import { EntryShell } from "@/components/checkpoints/entry/EntryShell";
import { DirectionSelect } from "@/components/DirectionSelect";
import { skillLevelsList } from "@/components/ui/skillLevel";
import type { SkillLevel } from "@/config/prisma-enums";
import { deleteCookie, getCookie } from "@/helpers/cookie";
import { resyncSession } from "@/helpers/session";
import {
	useEntryProfile,
	useEntrySpeciality,
	useEntryStatus,
	useSaveEntryAbout,
} from "@/hooks/checkpoint-entry";
import { useWorkDirections } from "@/hooks/library";

type AboutValues = {
	firstName: string;
	lastName: string;
	country: string;
	workDirectionId: string;
	specialityName: string;
	level: SkillLevel;
};

type ValidationIssue = {
	key: keyof AboutValues | "name";
	messageKey: string;
	message: string;
};

const PRE_REGISTRATION_COOKIES = [
	"auth.email.pre-registration",
	"auth.google.pre-registration",
];

/** The consents ticked on the registration page, when the user came from there. */
const readPreRegistration = () => {
	for (const name of PRE_REGISTRATION_COOKIES) {
		const raw = getCookie(name);
		if (!raw) continue;
		try {
			return JSON.parse(decodeURIComponent(raw)) as {
				agreeWithTermsAndPrivacy?: boolean;
				needSubscribeToNewsletter?: boolean;
			};
		} catch {
			return undefined;
		}
	}
	return undefined;
};

/** Item 1 (12.1): who the curator is going to work with. */
export function AboutClient() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const router = useRouter();
	const [form] = Form.useForm<AboutValues>();
	const { update: updateSession } = useSession();
	const countries = useMemo(() => countryList().getData(), []);

	const status = useEntryStatus();
	const profile = useEntryProfile();
	const speciality = useEntrySpeciality();
	const directions = useWorkDirections();
	const save = useSaveEntryAbout();

	const loading = profile.isPending || speciality.isPending;

	useEffect(() => {
		if (loading) return;
		const [firstName, ...rest] = (profile.data?.name ?? "").split(" ");
		form.setFieldsValue({
			firstName: firstName || undefined,
			lastName: rest.join(" ") || undefined,
			country: profile.data?.country ?? undefined,
			workDirectionId: speciality.data?.workDirectionId,
			specialityName: speciality.data?.name,
			level: speciality.data?.level,
		});
	}, [loading, profile.data, speciality.data, form]);

	const submit = async () => {
		let values: AboutValues;
		try {
			values = await form.validateFields();
		} catch {
			return;
		}

		try {
			const result = await save.mutateAsync({
				name: [values.firstName.trim(), values.lastName.trim()].join(" "),
				country: values.country,
				specialityId: speciality.data?.id,
				specialityName: values.specialityName.trim(),
				workDirectionId: values.workDirectionId,
				level: values.level,
				...readPreRegistration(),
			});
			// Advisory AI warnings are shown and never block the save.
			for (const warning of result.validation?.warnings ?? []) {
				message.warning(t(warning.messageKey, warning.message));
			}
			for (const name of PRE_REGISTRATION_COOKIES) deleteCookie(name);
			// The proxy reads `onboardingDone` from the JWT, so it is re-read before leaving.
			await resyncSession(updateSession);
			router.push(ENTRY_HUB_HREF);
		} catch (error) {
			const data = isAxiosError(error) ? error.response?.data : undefined;
			const issues: ValidationIssue[] = data?.validation?.errors ?? [];
			if (issues.length) {
				// The server's "name" is the two name fields joined; its error goes on the first.
				form.setFields(
					issues.map((issue) => ({
						name: issue.key === "name" ? "firstName" : issue.key,
						errors: [t(issue.messageKey, issue.message)],
					})),
				);
				return;
			}
			message.error(
				data?.message ??
					t("checkpointEntry.about.failed", "Could not save — try again"),
			);
		}
	};

	return (
		<EntryShell
			next={status.data?.hadCheckpoint}
			heading={t("checkpointEntry.about.title", "Tell us about yourself")}
			subtitle={t(
				"checkpointEntry.about.hint",
				"So the curator knows who they work with. The rest of your profile can wait.",
			)}
			foot={
				<>
					<Link href={ENTRY_HUB_HREF}>
						<Button>{t("checkpointEntry.cancel", "Cancel")}</Button>
					</Link>
					<Button type="primary" loading={save.isPending} onClick={submit}>
						{t("checkpointEntry.saveBack", "Save and go back")}
					</Button>
				</>
			}
		>
			{loading ? (
				<Skeleton active paragraph={{ rows: 6 }} title={false} />
			) : (
				<Form
					form={form}
					layout="vertical"
					variant="filled"
					requiredMark={false}
					autoComplete="off"
					scrollToFirstError
				>
					<Row gutter={[16, 0]}>
						<Col xs={24} md={12}>
							<Form.Item
								name="firstName"
								label={t("firstName", "First name")}
								rules={[{ required: true, whitespace: true }]}
							>
								<Input autoComplete="given-name" />
							</Form.Item>
						</Col>
						<Col xs={24} md={12}>
							<Form.Item
								name="lastName"
								label={t("lastName", "Last name")}
								rules={[{ required: true, whitespace: true }]}
							>
								<Input autoComplete="family-name" />
							</Form.Item>
						</Col>
						<Col xs={24} md={12}>
							<Form.Item
								name="country"
								label={t("country", "Country")}
								rules={[{ required: true }]}
							>
								<AutoComplete
									allowClear
									placeholder={t("country.placeholder", "Select country")}
									options={countries.map(({ label }) => ({
										value: label,
										label,
									}))}
									showSearch={{
										filterOption: (input, option) =>
											String(option?.value ?? "")
												.toLowerCase()
												.includes(input.toLowerCase()),
									}}
								/>
							</Form.Item>
						</Col>
						<Col xs={24} md={12}>
							<Form.Item
								name="workDirectionId"
								label={t("workDirection", "Work direction")}
								rules={[{ required: true }]}
							>
								<DirectionSelect
									showSearch
									optionFilterProp="label"
									options={directions.options ?? []}
								/>
							</Form.Item>
						</Col>
						<Col xs={24} md={12}>
							<Form.Item
								name="specialityName"
								label={t("specialityName", "Speciality")}
								rules={[{ required: true, whitespace: true }]}
							>
								<Input
									placeholder={t(
										"checkpointEntry.about.specialityPlaceholder",
										"e.g. Game designer",
									)}
								/>
							</Form.Item>
						</Col>
						<Col xs={24} md={12}>
							<Form.Item
								name="level"
								label={t("specialityLevel", "Skill level")}
								rules={[{ required: true }]}
							>
								<Select
									options={skillLevelsList.map((item) => ({
										value: item.value,
										label: (
											<span>
												{item.meter} {item.label}
											</span>
										),
									}))}
								/>
							</Form.Item>
						</Col>
					</Row>
				</Form>
			)}
		</EntryShell>
	);
}
