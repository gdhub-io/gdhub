import { BsCheckLg } from "@react-icons/all-files/bs/BsCheckLg";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { List, Modal, Spin } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";

const VacancyArchiveModal = ({
	projectId,
	projectName,
	teamId,
	open,
	onRestore,
	onCancel,
}: any) => {
	const { t } = useTranslate();
	const [processing, setProcessing] = useState(true);
	const [selectedItem, setSelectedItem] = useState<string>();

	const {
		data: archivedProjectVacancies,
		refetch: fetchArchivedProjectVacancies,
		isLoading: isLoadingMyArchivedProjectVacancies,
	} = useQuery({
		queryKey: ["project-team-vacancies", "archive", teamId],
		queryFn: () =>
			axios.get("/api/user/project/vacancies", {
				params: { teamId, isArchive: true },
			}),
		enabled: !!teamId,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: restoreVacancy } = useMutation({
		mutationFn: (params: { id: string }) =>
			axios.post<any>("/api/user/project/vacancy/restore", null, {
				params: { id: params.id },
			}),
	});

	useEffect(() => {
		if (open) {
			setProcessing(false);
			setSelectedItem(undefined);
			fetchArchivedProjectVacancies();
		}
	}, [open]);

	const handleCancel = () => {
		onCancel();
	};

	const handleOk = async () => {
		if (!selectedItem) return;

		try {
			setProcessing(true);

			// Restore = duplicate the archived vacancy into a fresh Draft (no payment);
			// the archived one stays Closed. Open the new vacancy for review/payment.
			const res = await restoreVacancy({ id: selectedItem });
			const newVacancyId = res?.data?.id;
			fetchArchivedProjectVacancies();

			setProcessing(false);
			onRestore(newVacancyId);
		} catch (error) {
			console.error(error);
			setProcessing(false);
		}
	};

	return (
		<Modal
			centered
			title={t(
				"modal.vacancyArchive.title",
				"Archive of open positions from the {projectName} project",
				{ projectName },
			)}
			width={800}
			destroyOnHidden
			mask={{ closable: false }}
			open={open}
			onCancel={handleCancel}
			confirmLoading={processing}
			okText={t("modal.vacancyArchive.restore", "Restore")}
			onOk={handleOk}
			okButtonProps={{
				disabled: !selectedItem,
			}}
		>
			<Spin spinning={processing}>
				<p>
					{t(
						"modal.vacancyArchive.selectVacancy",
						"Select the open position you want to restore",
					)}
				</p>
				<List
					bordered
					dataSource={archivedProjectVacancies?.data}
					renderItem={(vacancy: any) => (
						<List.Item
							style={{
								cursor: "pointer",
								fontWeight: selectedItem == vacancy.id ? "bold" : "normal",
							}}
							onClick={() => setSelectedItem(vacancy.id)}
							actions={
								selectedItem == vacancy.id
									? [
											<BsCheckLg
												color="var(--gd-neutral-950)"
												key="icon-check-speciality"
											/>,
										]
									: []
							}
						>
							{vacancy.title}
						</List.Item>
					)}
				/>
			</Spin>
		</Modal>
	);
};

export default VacancyArchiveModal;
