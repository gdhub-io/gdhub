import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Flex,
	Form,
	Input,
	Modal,
	message,
	Skeleton,
	Space,
	Switch,
	Typography,
} from "antd";
import axios from "axios";
import type React from "react";
import { useEffect, useState } from "react";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { LoadError } from "@/components/ui/LoadError";
import { useEvent } from "@/hooks/event";
import styles from "./style.module.scss";

/** The save button sits under the card, outside the form it submits. */
const ORGANIZER_FORM_ID = "event-certification-organizer";

type CertificationEventFormProps = {
	eventId: string;
};

interface EventCertificationFields {
	id: string;
	certificationEnabled?: boolean | null;
}

interface CertificationConfig {
	organizerName: string | null;
	organizerTitle: string | null;
	defaults: {
		organizerName: string;
		organizerTitle: string;
	};
}

interface CertificationConfigFormValues {
	organizerName: string;
	organizerTitle: string;
}

const CertificationEventForm: React.FC<CertificationEventFormProps> = ({
	eventId,
}) => {
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const [previewOpen, setPreviewOpen] = useState(false);
	const [configForm] = Form.useForm<CertificationConfigFormValues>();

	const {
		event,
		isLoading: isLoadingEvent,
		isError: isEventError,
		refetch: refetchEvent,
	} = useEvent(eventId);
	// Without the event the switch would read as "off" whatever the real setting is.
	const eventFailed = isEventError && !event;
	const enabled = !!event?.certificationEnabled;

	const {
		data: certificationConfig,
		isPending: isPendingConfig,
		isError: isConfigError,
		refetch: refetchConfig,
	} = useQuery({
		queryKey: ["event-certification-config", eventId],
		queryFn: () =>
			axios
				.get<CertificationConfig>(
					`/api/user/event/${eventId}/certification/config`,
				)
				.then((r) => r.data),
		enabled: !!eventId && enabled,
		refetchOnWindowFocus: false,
	});
	const configFailed = isConfigError && !certificationConfig;

	useEffect(() => {
		if (!certificationConfig) return;
		configForm.setFieldsValue({
			organizerName:
				certificationConfig.organizerName ??
				certificationConfig.defaults.organizerName,
			organizerTitle:
				certificationConfig.organizerTitle ??
				certificationConfig.defaults.organizerTitle,
		});
	}, [certificationConfig, configForm]);

	const { mutateAsync: saveConfig, isPending: isSavingConfig } = useMutation({
		mutationFn: (values: CertificationConfigFormValues) =>
			axios.put(`/api/user/event/${eventId}/certification/config`, {
				organizerName: values.organizerName?.trim() || null,
				organizerTitle: values.organizerTitle?.trim() || null,
			}),
		onSuccess: () => {
			message.success(
				t(
					"event.settings.certification.config.save.success",
					"Organizer settings saved",
				),
			);
			queryClient.invalidateQueries({
				queryKey: ["event-certification-config", eventId],
			});
		},
		onError: () => {
			message.error(
				t(
					"event.settings.certification.config.save.error",
					"Failed to save organizer settings",
				),
			);
		},
	});

	const handleResetOrganizer = () => {
		if (!certificationConfig) return;
		configForm.setFieldsValue({
			organizerName: certificationConfig.defaults.organizerName,
			organizerTitle: certificationConfig.defaults.organizerTitle,
		});
		saveConfig({ organizerName: "", organizerTitle: "" });
	};

	const { mutateAsync: toggleEnabled, isPending: isToggling } = useMutation({
		mutationFn: (next: boolean) =>
			axios.put(`/api/user/event/${eventId}`, {
				certificationEnabled: next,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["event", eventId] });
		},
		onError: () => {
			message.error(
				t(
					"event.settings.certification.toggle.error",
					"Failed to update certification setting",
				),
			);
		},
	});

	const previewPdfUrl = `/api/user/event/${eventId}/certification/template/pdf`;

	return (
		<>
			<Card
				title={t(
					"event.settings.certification.title",
					"Issue certificates for this event",
				)}
				variant="borderless"
				extra={
					eventFailed ? null : isLoadingEvent ? (
						<Skeleton.Button active size="small" shape="round" />
					) : (
						<Switch
							checked={enabled}
							loading={isToggling}
							onChange={(next) => toggleEnabled(next)}
						/>
					)
				}
			>
				<Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
					{t(
						"event.settings.certification.description",
						"Participants can be given a certificate once the event is over.",
					)}
				</Typography.Paragraph>

				{eventFailed && (
					<LoadError
						title={t(
							"event.settings.certification.load-error",
							"Certificate settings could not be loaded",
						)}
						onRetry={() => refetchEvent()}
					/>
				)}
				{enabled && configFailed && (
					<LoadError
						title={t(
							"event.settings.certification.load-error",
							"Certificate settings could not be loaded",
						)}
						onRetry={() => refetchConfig()}
					/>
				)}
				{enabled && isPendingConfig && <FormSkeleton fields={2} />}
				{enabled && !isPendingConfig && !configFailed && (
					<Space orientation="vertical" size="middle" style={{ width: "100%" }}>
						<div>
							<Typography.Title level={5} style={{ marginBottom: 8 }}>
								{t(
									"event.settings.certification.organizer.title",
									"Organizer signer",
								)}
							</Typography.Title>
							<Typography.Paragraph
								type="secondary"
								style={{ fontSize: 12, marginBottom: 12 }}
							>
								{t(
									"event.settings.certification.organizer.description",
									"Shown in the left signature block of the certificate. Leave blank to use the event creator's profile name and first speciality.",
								)}
							</Typography.Paragraph>
							<Form
								id={ORGANIZER_FORM_ID}
								form={configForm}
								layout="vertical"
								variant="filled"
								requiredMark="optional"
								onFinish={(values) => saveConfig(values)}
							>
								<Form.Item
									name="organizerName"
									label={t(
										"event.settings.certification.organizer.name.label",
										"Name",
									)}
								>
									<Input
										placeholder={
											certificationConfig?.defaults.organizerName || undefined
										}
									/>
								</Form.Item>
								<Form.Item
									name="organizerTitle"
									label={t(
										"event.settings.certification.organizer.title.label",
										"Title",
									)}
								>
									<Input
										placeholder={
											certificationConfig?.defaults.organizerTitle || undefined
										}
									/>
								</Form.Item>
								{/* The template is a thing to look at, not a field to fill,
									    so it gets its own row rather than sitting among the
									    form's actions. */}
								<Flex
									align="center"
									justify="space-between"
									gap={16}
									wrap
									className={styles.templateRow}
								>
									<Flex vertical gap={2}>
										<Typography.Text strong>
											{t(
												"event.settings.certification.template.title",
												"Certificate template",
											)}
										</Typography.Text>
										<Typography.Text type="secondary">
											{t(
												"event.settings.certification.template.description",
												"Check how the signature block looks before issuing anything.",
											)}
										</Typography.Text>
									</Flex>
									<Button onClick={() => setPreviewOpen(true)}>
										{t("event.settings.certification.preview", "Preview")}
									</Button>
								</Flex>
							</Form>
						</div>
					</Space>
				)}
			</Card>
			{enabled && !configFailed && (
				<Flex
					align="center"
					justify="space-between"
					gap={16}
					wrap
					className={styles.actions}
				>
					<Button
						type="primary"
						htmlType="submit"
						form={ORGANIZER_FORM_ID}
						loading={isSavingConfig}
					>
						{t("event.settings.certification.organizer.save", "Save")}
					</Button>
					<Button
						type="text"
						onClick={handleResetOrganizer}
						disabled={
							!certificationConfig?.organizerName &&
							!certificationConfig?.organizerTitle
						}
					>
						{t(
							"event.settings.certification.organizer.reset",
							"Reset to defaults",
						)}
					</Button>
				</Flex>
			)}

			<Modal
				open={previewOpen}
				title={t(
					"event.settings.certification.preview.title",
					"Certificate preview",
				)}
				onCancel={() => setPreviewOpen(false)}
				footer={null}
				width={900}
				centered
				destroyOnHidden
			>
				<object
					data={previewOpen ? previewPdfUrl : undefined}
					type="application/pdf"
					width="100%"
					style={{
						height: "70vh",
						border: "1px solid var(--gd-color-border)",
						borderRadius: 4,
					}}
				>
					<Typography.Paragraph>
						{t(
							"event.settings.certification.preview.fallback",
							"Your browser cannot display PDFs inline.",
						)}{" "}
						<a href={previewPdfUrl} target="_blank" rel="noreferrer">
							{t(
								"event.settings.certification.preview.download",
								"Open in a new tab",
							)}
						</a>
					</Typography.Paragraph>
				</object>
			</Modal>
		</>
	);
};

export default CertificationEventForm;
