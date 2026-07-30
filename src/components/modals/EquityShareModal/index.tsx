import type { ProjectEquity } from "@gdhub-io/gdhub-prisma";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Flex,
	Form,
	InputNumber,
	Modal,
	message,
	Slider,
	Space,
	Typography,
} from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import styles from "./styles.module.scss";

const { Text, Title } = Typography;

interface EquityShareModalProps {
	open: boolean;
	onOk: () => void;
	onCancel: () => void;
	projectEquity?: ProjectEquity & { equityAllocations: any[] };
	investors?: { share: number }[];
}

const EquityShareModal = ({
	projectEquity,
	open,
	onOk,
	onCancel,
	investors = [],
}: EquityShareModalProps) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const [equity, setEquity] = useState<ProjectEquity>();
	const [remainingPercentage, setRemainingPercentage] = useState<number>(0);

	// Calculate minimum investment reserve as sum of sold shares
	const minInvestmentReserve = investors.reduce(
		(sum, inv) => sum + (inv.share || 0),
		0,
	);

	// Calculate allocated shares (team, promises)
	const teamTotal =
		projectEquity?.equityAllocations?.reduce(
			(sum: number, share: any) =>
				sum +
				(share.percentage || 0) +
				(share.promises?.reduce(
					(acc: number, promise: any) => acc + (promise.percentage || 0),
					0,
				) || 0),
			0,
		) || 0;

	const platformShare = projectEquity?.platformShare || 0;
	const mentorFundShare =
		equity?.mentorFundShare ?? projectEquity?.mentorFundShare ?? 0;
	const investmentReserve =
		equity?.investmentReserve ?? projectEquity?.investmentReserve ?? 0;

	// Свободные доли = 100 - (platform + mentorFund + investmentReserve + teamTotal)
	const unallocated =
		100 - platformShare - mentorFundShare - investmentReserve - teamTotal;

	// Максимум для investmentReserve и mentorFundShare: свободные доли + текущее значение
	const maxInvestmentReserve = Math.max(0, unallocated + investmentReserve);
	const maxMentorFundShare = Math.max(0, unallocated + mentorFundShare);

	// Формируем marks для mentorFundShare только в пределах min-max
	const mentorMarks: Record<number, string> = {};
	[2, 5, 10, 15, 20].forEach((val) => {
		if (val >= 2 && val <= maxMentorFundShare) mentorMarks[val] = `${val}%`;
	});

	// Формируем marks для investmentReserve только в пределах min-max
	const investmentMarks: Record<number, string> = {};
	[minInvestmentReserve, 20, 40, 60].forEach((val) => {
		if (val >= minInvestmentReserve && val <= maxInvestmentReserve)
			investmentMarks[val] = `${val}%`;
	});

	useEffect(() => {
		setEquity(projectEquity);
	}, [projectEquity]);

	// Mutation for saving equity distribution
	const { mutateAsync: saveEquity, isPending: isSaving } = useMutation({
		mutationFn: (data: Partial<ProjectEquity>) =>
			axios.put("/api/user/project/equity", data),
		onSuccess: () => {
			onOk();
		},
	});

	// Handler for changing mentor fund share
	const handleMentorFundChange = (value: number | null) => {
		// Minimum 2%
		const newValue = Math.max(2, value || 2);
		setEquity((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				mentorFundShare: newValue,
			};
		});
	};

	// Handler for changing investment reserve
	const handleInvestmentReserveChange = (value: number | null) => {
		setEquity((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				investmentReserve: value || 0,
			};
		});
	};

	// Handler for saving data
	const handleOk = async () => {
		try {
			if (!equity) {
				message.error(t("Equity distribution not found"));
				return;
			}

			await saveEquity({
				id: equity.id,
				mentorFundShare: equity.mentorFundShare,
				investmentReserve: equity.investmentReserve,
			});
		} catch (error: any) {
			console.error(error);
		}
	};

	if (!projectEquity) {
		return null;
	}

	return (
		<Modal
			centered
			title={t("Equity Settings")}
			open={open}
			mask={{ closable: false }}
			width={600}
			onCancel={onCancel}
			footer={[
				<Button key="cancel" onClick={onCancel}>
					{t("Cancel")}
				</Button>,
				<Button
					key="submit"
					type="primary"
					loading={isSaving}
					onClick={handleOk}
					disabled={remainingPercentage < 0}
				>
					{t("Save")}
				</Button>,
			]}
		>
			<Space
				orientation="vertical"
				style={{ width: "100%", paddingInline: 8 }}
				size="large"
			>
				<div className={styles.equityRules}>
					<Title level={5}>{t("Equity Distribution Rules")}</Title>
					<ul>
						<li>{t("3% is fixed for the platform")}</li>
						<li>{t("At least 2% is allocated to the mentor fund")}</li>
						<li>{t("A portion should be reserved for future investments")}</li>
					</ul>
				</div>

				{/* Settings for equity distribution */}
				<Form form={form} variant="filled" layout="vertical">
					{/* Mentor fund share (minimum 2%) */}
					<Form.Item
						name="mentorFundShare"
						label={t("Mentor Fund Share (minimum 2%)")}
					>
						<Flex align="center" gap={16}>
							<div className={styles.sliderContainer}>
								<Slider
									min={2}
									max={maxMentorFundShare}
									defaultValue={2}
									value={equity?.mentorFundShare ?? 2}
									onChange={handleMentorFundChange}
									marks={mentorMarks}
								/>
							</div>
							<InputNumber
								min={2}
								max={maxMentorFundShare}
								value={equity?.mentorFundShare ?? 2}
								onChange={handleMentorFundChange}
								addonAfter="%"
								style={{ width: "110px" }}
							/>
						</Flex>
					</Form.Item>

					{/* Investment reserve */}
					<Form.Item name="investmentReserve" label={t("Investment Reserve")}>
						<Flex align="center" gap={16}>
							<div className={styles.sliderContainer}>
								<Slider
									min={minInvestmentReserve}
									max={maxInvestmentReserve}
									value={equity?.investmentReserve ?? 40}
									onChange={handleInvestmentReserveChange}
									marks={investmentMarks}
								/>
							</div>
							<InputNumber
								min={minInvestmentReserve}
								max={maxInvestmentReserve}
								value={equity?.investmentReserve ?? 40}
								onChange={handleInvestmentReserveChange}
								addonAfter="%"
								style={{ width: "110px" }}
							/>
						</Flex>
					</Form.Item>
				</Form>
			</Space>
		</Modal>
	);
};

export default EquityShareModal;
