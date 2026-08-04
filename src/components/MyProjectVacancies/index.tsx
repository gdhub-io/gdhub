import type {
	PaymentRateType,
	PaymentStatus,
	TeamVacancyStatus,
} from "@gdhub-io/gdhub-prisma";
import {
	IconDotsVertical,
	IconExternalLink,
	IconFileDownload,
	IconLock,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Dropdown,
	Flex,
	Grid,
	Modal,
	message,
	Space,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useContext, useState } from "react";

import ModernTable from "@/components/ModernTable";
import tableStyles from "@/components/ModernTable/ModernTable.module.scss";
import VacancyModal from "@/components/modals/VacancyModal";
import { ProjectContext } from "@/contexts/ProjectContext";
import { usePaddle } from "@/services/paddle/usePaddle";
import VacancyArchiveModal from "../modals/VacancyArchiveModal";

const { Text } = Typography;

interface VacancyPayment {
	id: string;
	status: PaymentStatus;
	completedAt?: string | null;
}

interface Vacancy {
	key: string;
	Name: string;
	Description: string;
	FinishedAt: string;
	Status: TeamVacancyStatus;
	promisePercentage?: number | null;
	// Offered compensation (EUR) lives on the vacancy; payment row is the fee/status.
	offeredAmount?: number | null;
	offeredRateType?: PaymentRateType | null;
	payment?: VacancyPayment | null;
	direction?: { name: string } | null;
	[key: string]: any;
}

const MyProjectVacancies = () => {
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();
	const params = useParams();
	const projectSlug = params?.slug as string | undefined;
	const contextProject = useContext(ProjectContext)?.contextProject;
	const isProjectArchived =
		!contextProject || !!contextProject.isProjectArchived;
	const [showVacancyModal, setShowVacancyModal] = useState(false);
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>();
	const [showVacancyArchiveModal, setShowVacancyArchiveModal] = useState(false);

	const {
		data: projectVacancies,
		refetch: fetchMyProjectVacancies,
		isLoading: isLoadingMyMyProjectVacancies,
	} = useQuery({
		queryKey: ["project-team-vacancies", contextProject?.team?.id],
		queryFn: () =>
			axios.get("/api/user/project/vacancies", {
				params: { teamId: contextProject?.team?.id },
			}),
		enabled: !!contextProject?.team?.id,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: cancelVacany } = useMutation({
		mutationFn: (data: { id: string }) =>
			axios.delete<any>("/api/user/project/vacancy", { params: data }),
	});

	const { mutateAsync: publishVacancy } = useMutation({
		mutationFn: (params: { id: string; data: Record<string, any> }) =>
			axios.put<any>("/api/user/project/vacancy", params.data, {
				params: { id: params.id },
			}),
	});

	const { checkout } = usePaddle();
	const { data: session } = useSession();

	const vacanciesColumns: ColumnsType<Vacancy> = [
		{
			title: t("Title"),
			dataIndex: "title",
			key: "title",
			render: (value, data) => (
				<Space orientation="vertical" size={2}>
					<Text
						className={tableStyles.tableMemberName}
						onClick={() => {
							if (!isProjectArchived) handleEditVacancy(data.id);
						}}
						style={{ cursor: isProjectArchived ? "default" : "pointer" }}
					>
						{value}
					</Text>
					{data.status == "Draft" && (
						<Tag color="lime" style={{ marginInlineEnd: 0 }}>
							{t(`vacancy.status.${data.status}`, data.status)}
						</Tag>
					)}
				</Space>
			),
		},
		{
			title: t("Direction"),
			key: "direction",
			responsive: ["md"],
			render: (_value, record) => (
				<Text className={tableStyles.tableMemberPosition}>
					{record.direction?.name ?? "—"}
				</Text>
			),
		},
		{
			title: t("Valid until"),
			dataIndex: "finishedAt",
			key: "finishedAt",
			responsive: ["md"],
			render: (value) =>
				value ? (
					<Text
						className={tableStyles.tableMemberDates}
						style={{ whiteSpace: "nowrap" }}
					>
						{dayjs(value).format("DD.MM.YYYY")}
					</Text>
				) : (
					<Text type="secondary">—</Text>
				),
		},
		{
			title: t("Payment"),
			key: "payment",
			align: "center",
			responsive: ["md"],
			render: (_value, record) => {
				// Offered compensation now lives on the vacancy (EUR).
				if (!record.offeredAmount || !record.offeredRateType) {
					return <Text type="secondary">—</Text>;
				}

				const rateLabel =
					{
						Hourly: t("vacancy.rate.Hourly", "per hour"),
						OneTime: t("vacancy.rate.OneTime", "one-time"),
						Monthly: t("vacancy.rate.Monthly", "per month"),
					}[record.offeredRateType as string] ?? "";

				return (
					<Tag
						color="purple"
						style={{ marginInlineEnd: 0, whiteSpace: "nowrap" }}
					>
						{`€${record.offeredAmount} · ${rateLabel}`}
					</Tag>
				);
			},
		},
		{
			title: t("Paid"),
			key: "paid",
			align: "center",
			responsive: ["md"],
			render: (_value, record) => {
				const payment = record.payment;
				if (!payment) return <Text type="secondary">—</Text>;

				const statusConfig: Record<string, { color: string; label: string }> = {
					COMPLETED: {
						color: "green",
						label: t("vacancy.payment.status.COMPLETED", "Paid"),
					},
					PENDING: {
						color: "orange",
						label: t("vacancy.payment.status.PENDING", "Pending"),
					},
					FAILED: {
						color: "red",
						label: t("vacancy.payment.status.FAILED", "Failed"),
					},
					REFUNDED: {
						color: "default",
						label: t("vacancy.payment.status.REFUNDED", "Refunded"),
					},
				};

				const config = statusConfig[payment.status] ?? {
					color: "default",
					label: payment.status,
				};

				return (
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							whiteSpace: "nowrap",
						}}
					>
						<Tag color={config.color} style={{ marginInlineEnd: 0 }}>
							{config.label}
						</Tag>
						{payment.status === "COMPLETED" && payment.completedAt && (
							<Text type="secondary" style={{ fontSize: 12 }}>
								{dayjs(payment.completedAt).format("ll")}
							</Text>
						)}
					</span>
				);
			},
		},
		{
			title: t("Equity"),
			dataIndex: "promisePercentage",
			key: "promisePercentage",
			align: "center",
			responsive: ["md"],
			render: (value) =>
				value && value > 0 ? (
					<Tag color="blue" style={{ marginInlineEnd: 0 }}>{`${value}%`}</Tag>
				) : (
					<Text type="secondary">—</Text>
				),
		},
		{
			key: "links",
			dataIndex: "id",
			align: "center",
			responsive: ["md"],
			render: (value, record) => (
				<Tooltip title={t("MyProjectVacancies.link", "Go to the page")}>
					<Link
						href={`/job/${value}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button type="text" icon={<IconExternalLink size={18} />} />
					</Link>
				</Tooltip>
			),
		},
		{
			key: "actions",
			width: "1%",
			align: "right",
			hidden: isProjectArchived,
			render: (value, record) => {
				const hasReceipt = record.payment?.status === "COMPLETED";

				return (
					<Space>
						{screens.md && (
							<Button onClick={() => handleEditVacancy(record.id)}>
								{t("MyProjectVacancies.change", "Change")}
							</Button>
						)}
						{record.status !== "Published" && (
							<Button type="primary" onClick={() => handlePublish(record)}>
								{record.payment && record.payment.status !== "COMPLETED"
									? t("Pay & Publish")
									: t("Publish")}
							</Button>
						)}
						<Dropdown
							trigger={["click"]}
							menu={{
								items: [
									...(hasReceipt
										? [
												{
													key: "receipt",
													icon: <IconFileDownload />,
													label: t(
														"MyProjectVacancies.downloadReceipt",
														"Download receipt",
													),
													onClick: () => handleOpenReceipt(record),
												},
											]
										: []),
									{
										key: "archive",
										danger: true,
										icon: <IconLock />,
										label: t("MyProjectVacancies.archiveVacancy", "Archive"),
										onClick: () => confirmArchiveVacancy(record.id),
									},
								],
							}}
						>
							<Button
								type="text"
								aria-label={t("MyProjectVacancies.actions", "Actions")}
								icon={<IconDotsVertical />}
							/>
						</Dropdown>
					</Space>
				);
			},
		},
	];

	const handleEditVacancy = (id: string) => {
		if (isProjectArchived) return;

		setSelectedVacancyId(id);
		setShowVacancyModal(true);
	};

	const handlePublish = async (record: Vacancy) => {
		if (isProjectArchived) return;

		const payment = record.payment;
		// Paid vacancy whose listing fee isn't settled yet → go through checkout.
		// The vacancy stays a draft and gets published by the Paddle webhook once paid.
		const needsCheckout = !!payment && payment.status !== "COMPLETED";

		try {
			if (needsCheckout && payment) {
				const priceId = process.env.NEXT_PUBLIC_PADDLE_VACANCY_PRICE_ID;
				if (!priceId) {
					message.warning(
						t(
							"modal.vacancy.paymentNotConfigured",
							"Payment is not configured yet. The position was saved as a draft.",
						),
					);
					return;
				}

				const baseUrl =
					typeof window !== "undefined"
						? window.location.origin
						: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
				const successUrl = projectSlug
					? `${baseUrl}/user/project/${projectSlug}/open-positions?payment_success=true`
					: `${baseUrl}/user/project`;

				await checkout({
					priceId,
					customData: { paymentId: payment.id },
					successUrl,
					customerEmail: session?.user?.email,
				});
				return;
			}

			await publishVacancy({
				id: record.id,
				data: { status: "Published", publishedAt: dayjs().toISOString() },
			});
			fetchMyProjectVacancies();
			message.success(
				t("MyProjectVacancies.published", "The open position is published"),
			);
		} catch (error: any) {
			message.error(
				error?.message ??
					t("form.error", "Error.Check if all data is entered correctly"),
			);
		}
	};

	const handleOpenReceipt = async (record: Vacancy) => {
		try {
			const res = await axios.get("/api/user/project/vacancy/payment/invoice", {
				params: { vacancyId: record.id },
			});
			const url = res?.data?.url;
			if (url) {
				window.open(url, "_blank", "noopener,noreferrer");
			} else {
				message.error(
					t(
						"MyProjectVacancies.receiptUnavailable",
						"Receipt is not available",
					),
				);
			}
		} catch {
			message.error(
				t("MyProjectVacancies.receiptUnavailable", "Receipt is not available"),
			);
		}
	};

	const handleCloseVacancy = async (id: string) => {
		if (isProjectArchived) return;

		// await fetcher({ url: '/api/user/project/vacancy/close', data: { id } })
		await cancelVacany({ id });
		setSelectedVacancyId(undefined);
		fetchMyProjectVacancies();

		message.success(
			t("MyProjectVacancies.theVacancyIsClosed", "The open position is closed"),
		);
	};

	const confirmArchiveVacancy = (id: string) => {
		Modal.confirm({
			title: t("You definitely want to close the open position?"),
			okText: t("MyProjectVacancies.yes", "Yes"),
			cancelText: t("MyProjectVacancies.no", "No"),
			okButtonProps: { danger: true },
			onOk: () => handleCloseVacancy(id),
		});
	};

	const handleSaveVacancy = () => {
		setShowVacancyModal(false);
		setSelectedVacancyId(undefined);
		fetchMyProjectVacancies();
	};

	const handleRestoreVacation = (vacancyId: string) => {
		if (isProjectArchived) return;

		setShowVacancyArchiveModal(false);
		fetchMyProjectVacancies();

		setSelectedVacancyId(vacancyId);
		setShowVacancyModal(!!vacancyId);
	};

	return (
		<>
			<Flex justify="space-between" align="center">
				{!isProjectArchived && (
					<Button onClick={() => setShowVacancyModal(true)}>
						{t("MyProjectVacancies.addTheVacancy", "Add open position")}
					</Button>
				)}

				{!isProjectArchived && (
					<Button type="link" onClick={() => setShowVacancyArchiveModal(true)}>
						{t("MyProjectVacancies.archive", "Archive")}
					</Button>
				)}
			</Flex>

			{projectVacancies?.data.length > 0 ? (
				<ModernTable
					showHeader
					loading={isLoadingMyMyProjectVacancies}
					columns={vacanciesColumns.filter((column) => !column.hidden)}
					dataSource={projectVacancies?.data?.map((m: any) => ({
						...m,
						key: m.id,
					}))}
					pagination={false}
				/>
			) : (
				<p style={{ marginTop: 12, color: "gray" }}>
					{t(
						"MyProjectVacancies.thereAreNoOpenVacanciesAtTheMoment",
						"There are no open positions at the moment",
					)}
				</p>
			)}

			{!isProjectArchived && (
				<>
					<VacancyModal
						teamId={contextProject?.team?.id}
						projectId={contextProject?.id}
						projectSlug={projectSlug}
						vacancyId={selectedVacancyId}
						open={showVacancyModal}
						onCancel={() => {
							setShowVacancyModal(false);
							setSelectedVacancyId(undefined);
						}}
						onOk={handleSaveVacancy}
					/>

					<VacancyArchiveModal
						teamId={contextProject?.team?.id}
						projectId={contextProject?.id}
						projectName={contextProject?.name}
						open={showVacancyArchiveModal}
						onCancel={() => {
							setShowVacancyArchiveModal(false);
						}}
						onRestore={handleRestoreVacation}
					/>
				</>
			)}
		</>
	);
};

export default MyProjectVacancies;
