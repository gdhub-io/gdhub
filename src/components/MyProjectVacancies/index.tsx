import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { HiOutlineLockClosed } from "@react-icons/all-files/hi/HiOutlineLockClosed";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Flex,
	Grid,
	message,
	Popconfirm,
	Space,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useContext, useState } from "react";
import ModernTable from "@/components/ModernTable";
import tableStyles from "@/components/ModernTable/ModernTable.module.scss";
import VacancyModal from "@/components/modals/VacancyModal";
import { ProjectContext } from "@/contexts/ProjectContext";
import VacancyArchiveModal from "../modals/VacancyArchiveModal";

const { Text } = Typography;

interface Vacancy {
	key: string;
	Name: string;
	Description: string;
	FinishedAt: string;
	Status: prismaClient.TeamVacancyStatus;
	[key: string]: any;
}

const MyProjectVacancies = () => {
	const screens = Grid.useBreakpoint();
	const { t } = useTranslate();
	const contextProject = useContext(ProjectContext)?.contextProject;
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

	const vacanciesColumns: ColumnsType<Vacancy> = [
		{
			title: t("Title"),
			dataIndex: "title",
			key: "title",
			width: "50%",
			render: (value, data) => (
				<Space direction="vertical" size={0}>
					<Text
						className={tableStyles.tableMemberName}
						onClick={() => handleEditVacancy(data.id)}
						style={{ cursor: "pointer" }}
					>
						{value}
					</Text>
					{data.status == "Draft" && (
						<Tag color="lime">
							{t(`vacancy.status.${data.status}`, data.status)}
						</Tag>
					)}
				</Space>
			),
		},
		{
			title: t("Direction"),
			dataIndex: "direction",
			key: "direction",
			responsive: ["md"],
			render: (value) => (
				<Text className={tableStyles.tableMemberPosition}>{value}</Text>
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
					>{`${t("to")} ${dayjs(value).format("LLL")}`}</Text>
				) : null,
		},
		{
			key: "links",
			dataIndex: "id",
			responsive: ["md"],
			render: (value, record) => (
				<Link href={`/job/${value}`} target="_blank" rel="noopener noreferrer">
					{t("MyProjectVacancies.link", "Go to the page")}
				</Link>
			),
		},
		{
			key: "actions",
			width: "1%",
			render: (value, record) => (
				<Space>
					{screens.md && (
						<Button onClick={() => handleEditVacancy(record.id)}>
							{t("MyProjectVacancies.change", "Change")}
						</Button>
					)}
					<Popconfirm
						title={t("You definitely want to close the open position?")}
						okText={t("MyProjectVacancies.yes", "Yes")}
						cancelText={t("MyProjectVacancies.no", "No")}
						onConfirm={() => handleCloseVacancy(record.id)}
					>
						<Button type="text" danger>
							<HiOutlineLockClosed />
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	const handleEditVacancy = (id: string) => {
		setSelectedVacancyId(id);
		setShowVacancyModal(true);
	};

	const handleCloseVacancy = async (id: string) => {
		// await fetcher({ url: '/api/user/project/vacancy/close', data: { id } })
		await cancelVacany({ id });
		setSelectedVacancyId(undefined);
		fetchMyProjectVacancies();

		message.success(
			t("MyProjectVacancies.theVacancyIsClosed", "The open position is closed"),
		);
	};

	const handleSaveVacancy = () => {
		setShowVacancyModal(false);
		setSelectedVacancyId(undefined);
		fetchMyProjectVacancies();
	};

	const handleRestoreVacation = (vacancyId: string) => {
		setShowVacancyArchiveModal(false);
		fetchMyProjectVacancies();

		setSelectedVacancyId(vacancyId);
		setShowVacancyModal(!!vacancyId);
	};

	return (
		<>
			<Flex justify="space-between" align="center">
				<Button onClick={() => setShowVacancyModal(true)}>
					{t("MyProjectVacancies.addTheVacancy", "Add open position")}
				</Button>

				<Button type="link" onClick={() => setShowVacancyArchiveModal(true)}>
					{t("MyProjectVacancies.archive", "Archive")}
				</Button>
			</Flex>

			{projectVacancies?.data.length > 0 ? (
				<ModernTable
					showHeader={false}
					loading={isLoadingMyMyProjectVacancies}
					columns={vacanciesColumns}
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

			<VacancyModal
				teamId={contextProject?.team?.id}
				projectId={contextProject?.id}
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
	);
};

export default MyProjectVacancies;
