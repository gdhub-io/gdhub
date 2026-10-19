"use client";

import { useTranslate } from "@tolgee/react";
import { App, Button, Col, Form, Input, Row, Select, Skeleton } from "antd";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { EntryShell } from "@/components/checkpoints/entry/EntryShell";
import {
	entryHubHref,
	entryProjectHref,
} from "@/components/checkpoints/entry/hrefs";
import { DirectionSelect } from "@/components/DirectionSelect";
import {
	ClickwrapField,
	clickwrapFieldName,
	legalAcceptances,
	missingLegalCode,
	outdatedLegalCode,
} from "@/components/legal/ClickwrapField";
import { skillLevelsList } from "@/components/ui/skillLevel";
import {
	CHECKPOINT_EXPERIENCE_MAX,
	CHECKPOINT_MIN_AGE,
} from "@/config/checkpoint";
import type { SkillLevel } from "@/config/prisma-enums";
import { deleteCookie, getCookie } from "@/helpers/cookie";
import { resyncSession } from "@/helpers/session";
import {
	useEntryProfile,
	useEntrySpeciality,
	useEntryStatus,
	useRateLimitWarning,
	useSaveEntryAbout,
} from "@/hooks/checkpoint-entry";
import { useWorkDirections } from "@/hooks/library";
import type { LegalAcceptanceInput } from "@/lib/legal/accept";

type AboutValues = {
	name: string;
	yearOfBirth: number;
	timezone: string;
	workDirectionId: string;
	specialityName: string;
	level: SkillLevel;
	experience?: string;
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

/** Every IANA zone the browser knows, labelled with its current offset. */
const timezoneOptions = () =>
	Intl.supportedValuesOf("timeZone").map((zone) => ({
		value: zone,
		label: `${zone.replaceAll("_", " ")} · UTC${dayjs().tz(zone).format("Z")}`,
	}));

/** The years onboarding offers, newest first. */
const yearOptions = () =>
	Array.from({ length: 84 }, (_, i) => {
		const year = dayjs().year() - 16 - i;
		return { value: year, label: String(year) };
	});

/** The consents ticked on the registration page, when the user came from there. */
const readPreRegistration = () => {
	for (const name of PRE_REGISTRATION_COOKIES) {
		const raw = getCookie(name);
		if (!raw) continue;
		try {
			return JSON.parse(decodeURIComponent(raw)) as {
				legal?: LegalAcceptanceInput[];
				needSubscribeToNewsletter?: boolean;
			};
		} catch {
			return undefined;
		}
	}
	return undefined;
};

export type AboutClientProps = {
	/** `?project=`, handed back to the hub on the way out. */
	projectSlug?: string;
};

/** Item 1 (12.1): who the curator is going to work with. */
export function AboutClient({ projectSlug }: AboutClientProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const router = useRouter();
	const [form] = Form.useForm<AboutValues>();
	const { data: session, update: updateSession } = useSession();
	const timezones = useMemo(timezoneOptions, []);
	const years = useMemo(yearOptions, []);

	const status = useEntryStatus();
	const profile = useEntryProfile();
	const speciality = useEntrySpeciality();
	const directions = useWorkDirections();
	const save = useSaveEntryAbout();
	const rateLimited = useRateLimitWarning();
	const hubHref = entryHubHref(projectSlug);
	// Read once: the cookie is gone after a save, and the form must not jump.
	const [preRegistration] = useState(readPreRegistration);
	// The server can still refuse for missing consent; then the checkbox appears regardless.
	const [termsRefused, setTermsRefused] = useState(false);
	const [termsStale, setTermsStale] = useState(false);

	const loading = profile.isPending || speciality.isPending || status.isPending;
	const askTerms =
		termsRefused ||
		(!!status.data &&
			!status.data.termsAccepted &&
			!preRegistration?.legal?.length);

	useEffect(() => {
		if (loading) return;
		form.setFieldsValue({
			// A fresh Google sign-up has a name on the account and no profile yet.
			name: profile.data?.name || session?.user.name || undefined,
			yearOfBirth: profile.data?.yearOfBirth || undefined,
			timezone:
				profile.data?.timezone ??
				Intl.DateTimeFormat().resolvedOptions().timeZone,
			workDirectionId: speciality.data?.workDirectionId,
			specialityName: speciality.data?.name,
			level: speciality.data?.level,
			experience: speciality.data?.specialization || undefined,
		});
	}, [loading, profile.data, speciality.data, session?.user.name, form]);

	const underage = t(
		"checkpointEntry.about.underage",
		"You need to be 18 or over to head for a checkpoint",
	);

	const submit = async () => {
		let values: AboutValues;
		try {
			values = await form.validateFields();
		} catch {
			return;
		}

		try {
			const result = await save.mutateAsync({
				name: values.name.trim(),
				yearOfBirth: values.yearOfBirth,
				timezone: values.timezone,
				specialityId: speciality.data?.id,
				specialityName: values.specialityName.trim(),
				workDirectionId: values.workDirectionId,
				level: values.level,
				experience: values.experience?.trim() || undefined,
				needSubscribeToNewsletter: preRegistration?.needSubscribeToNewsletter,
				legal: askTerms
					? legalAcceptances(["TermsOfUse"])
					: preRegistration?.legal,
			});
			// Advisory AI warnings are shown and never block the save.
			for (const warning of result.validation?.warnings ?? []) {
				message.warning(t(warning.messageKey, warning.message));
			}
			for (const name of PRE_REGISTRATION_COOKIES) deleteCookie(name);
			// The proxy reads `onboardingDone` from the JWT, so it is re-read before leaving.
			await resyncSession(updateSession);
			// Done before means it was opened from the hub to edit; otherwise on to the project.
			router.push(
				status.data?.aboutDone ? hubHref : entryProjectHref(projectSlug),
			);
		} catch (error) {
			if (rateLimited(error)) return;
			// The registration page's tick was missing or is outdated: ask here.
			if (missingLegalCode(error) || outdatedLegalCode(error)) {
				setTermsRefused(true);
				setTermsStale(!!outdatedLegalCode(error));
				form.setFieldValue(clickwrapFieldName("TermsOfUse") as never, false);
				return;
			}
			const data = isAxiosError(error) ? error.response?.data : undefined;
			const issues: ValidationIssue[] = data?.validation?.errors ?? [];
			if (issues.length) {
				form.setFields(
					issues.map((issue) => ({
						name: issue.key,
						errors: [t(issue.messageKey, issue.message)],
					})),
				);
				return;
			}
			if (data?.error === "underage") {
				form.setFields([{ name: "yearOfBirth", errors: [underage] }]);
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
				"checkpointEntry.about.subtitle",
				"Your speciality and level help the curator pitch their advice. The rest of your profile can wait.",
			)}
			foot={
				<>
					<Link href={hubHref}>
						<Button>{t("checkpointEntry.cancel", "Cancel")}</Button>
					</Link>
					<Button type="primary" loading={save.isPending} onClick={submit}>
						{status.data?.aboutDone
							? t("checkpointEntry.saveBack", "Save and go back")
							: t("checkpointEntry.saveContinue", "Save and continue")}
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
						<Col xs={24} md={16}>
							<Form.Item
								name="name"
								label={t("checkpointEntry.about.name", "Name")}
								rules={[{ required: true, whitespace: true }]}
							>
								<Input autoComplete="name" />
							</Form.Item>
						</Col>
						<Col xs={24} md={8}>
							<Form.Item
								name="yearOfBirth"
								label={t("yearOfBirth", "Year of birth")}
								rules={[
									{ required: true },
									{
										validator: (_, year?: number) =>
											!year || dayjs().year() - year >= CHECKPOINT_MIN_AGE
												? Promise.resolve()
												: Promise.reject(new Error(underage)),
									},
								]}
							>
								<Select options={years} showSearch />
							</Form.Item>
						</Col>
						<Col xs={24} md={12}>
							<Form.Item
								name="timezone"
								label={t("checkpointEntry.about.timezone", "Time zone")}
								rules={[{ required: true }]}
							>
								<Select
									options={timezones}
									showSearch
									optionFilterProp="label"
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
						<Col span={24}>
							<Form.Item
								name="experience"
								label={t(
									"checkpointEntry.about.experience",
									"Briefly about your experience",
								)}
								extra={t(
									"checkpointEntry.about.experienceHelp",
									"So your project's curator can learn a little more about you before the start.",
								)}
							>
								<Input.TextArea
									autoSize={{ minRows: 3, maxRows: 6 }}
									maxLength={CHECKPOINT_EXPERIENCE_MAX}
									showCount
								/>
							</Form.Item>
						</Col>
					</Row>
					{askTerms && <ClickwrapField code="TermsOfUse" stale={termsStale} />}
				</Form>
			)}
		</EntryShell>
	);
}
