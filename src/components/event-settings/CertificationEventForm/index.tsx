import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Form,
	Input,
	Modal,
	message,
	Space,
	Spin,
	Switch,
	Typography,
} from "antd";
import axios from "axios";
import type React from "react";
import { useEffect, useState } from "react";

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

	const { data: eventResponse, isFetching: isFetchingEvent } = useQuery({
		queryKey: ["event", eventId],
		queryFn: () =>
			axios.get<EventCertificationFields>(`/api/user/event/${eventId}`),
		enabled: !!eventId,
		refetchOnWindowFocus: false,
	});

	const event = eventResponse?.data;
	const enabled = !!event?.certificationEnabled;

	const { data: certificationConfig, isFetching: isFetchingConfig } = useQuery({
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
				title={t("event.settings.certification.title", "Certification")}
				variant="borderless"
				extra={
					<Switch
						checked={enabled}
						loading={isToggling || isFetchingEvent}
						onChange={(next) => toggleEnabled(next)}
					/>
				}
			>
				<Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
					{t(
						"event.settings.certification.description",
						"When enabled, you can issue certificates to event participants from the Members page.",
					)}
				</Typography.Paragraph>

				{enabled && (
					<Spin spinning={isFetchingConfig}>
						<Space
							orientation="vertical"
							size="middle"
							style={{ width: "100%" }}
						>
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
									form={configForm}
									layout="vertical"
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
												certificationConfig?.defaults.organizerTitle ||
												undefined
											}
										/>
									</Form.Item>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
										}}
									>
										<Space>
											<Button
												type="primary"
												htmlType="submit"
												loading={isSavingConfig}
											>
												{t(
													"event.settings.certification.organizer.save",
													"Save",
												)}
											</Button>
											<Button
												onClick={handleResetOrganizer}
												disabled={
													!certificationConfig?.organizerName &&
													!certificationConfig?.organizerTitle
												}
											>
												{t(
													"event.settings.certification.organizer.reset",
													"Reset to default",
												)}
											</Button>
										</Space>
										<Button onClick={() => setPreviewOpen(true)}>
											{t("event.settings.certification.preview", "Preview PDF")}
										</Button>
									</div>
								</Form>
							</div>
						</Space>
					</Spin>
				)}
			</Card>

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
