import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, DatePicker, Form, Input, Modal, message } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";
import { DirectionSelect } from "@/components/DirectionSelect";
import { gtmEventTrigger } from "@/helpers/gtm";
import { useWorkDirections } from "@/hooks/library";

interface InviteMemberModalProps {
	teamId: string;
	projectName: string;
	open: boolean;
	onOk: () => void;
	onCancel: () => void;
}

const InviteMemberModal = ({
	teamId,
	projectName,
	open,
	onOk,
	onCancel,
}: InviteMemberModalProps) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { options: directionsOptions } = useWorkDirections();
	const [isEmailValid, setIsEmailValid] = useState(true);

	const { mutateAsync: inviteMember, isPending: isInviting } = useMutation({
		mutationFn: (data: Record<string, any>) =>
			axios.post<any>("/api/user/project/team/invite", data),
		onSuccess: () => {
			message.success(t("Invitation sent successfully"));
			form.resetFields();

			onOk();
		},
		onError: (error: any) => {
			console.error(error);
			message.error(
				error.response?.data?.message ||
					error.message ||
					t("Failed to send invitation"),
			);
		},
	});

	const handleOk = async () => {
		try {
			const formData = await form.validateFields();

			await inviteMember({
				teamId,
				email: formData.email,
				position: formData.position,
				directionId: formData.directionId,
				startedAt: formData.startedAt
					? formData.startedAt.toISOString()
					: new Date().toISOString(),
			});

			gtmEventTrigger("job", {
				action: "invite",
				vacancyName: formData.position,
				projectName: projectName,
			});
		} catch (error) {
			console.error("Validation failed:", error);
		}
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	const validateEmail = (email: string) => {
		const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
		setIsEmailValid(isValid);
		return isValid;
	};

	return (
		<Modal
			title={t("inviteMemberModal.title", "Invite Team Member")}
			open={open}
			centered
			onCancel={handleCancel}
			footer={[
				<Button key="cancel" onClick={handleCancel}>
					{t("inviteMemberModal.cancel", "Cancel")}
				</Button>,
				<Button
					key="submit"
					type="primary"
					loading={isInviting}
					onClick={handleOk}
					disabled={!isEmailValid}
				>
					{t("inviteMemberModal.sendInvitation", "Send Invitation")}
				</Button>,
			]}
		>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				initialValues={{
					position: "",
					email: "",
					directionId: undefined,
					startedAt: dayjs(),
				}}
			>
				<Form.Item
					name="email"
					label={t("inviteMemberModal.email", "Email")}
					rules={[
						{ required: true, message: t("Please enter email") },
						{
							validator: (_, value) =>
								validateEmail(value)
									? Promise.resolve()
									: Promise.reject(new Error(t("Please enter a valid email"))),
						},
					]}
				>
					<Input placeholder={t("Enter email address")} />
				</Form.Item>

				<Form.Item
					name="position"
					label={t("inviteMemberModal.position", "Position")}
					rules={[{ required: true, message: t("Please enter position") }]}
				>
					<Input placeholder={t("Enter position")} />
				</Form.Item>

				<Form.Item
					name="directionId"
					label={t("inviteMemberModal.workDirection", "Work Direction")}
					rules={[
						{ required: true, message: t("Please select work direction") },
					]}
				>
					<DirectionSelect
						placeholder={t("Select work direction")}
						options={directionsOptions ?? []}
					/>
				</Form.Item>

				<Form.Item
					name="startedAt"
					label={t("inviteMemberModal.startDate", "Start Date")}
					rules={[{ required: true, message: t("Please select start date") }]}
				>
					<DatePicker
						format="DD.MM.YYYY"
						placeholder={t("Select start date")}
						style={{ width: "100%" }}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default InviteMemberModal;
