import { TbBrandTelegram } from "@react-icons/all-files/tb/TbBrandTelegram";
import { useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { Alert, Button, Space } from "antd";
import axios from "axios";
import Link from "next/link";
import GdhubLogo from "@/assets/images/gdhub-beta-logo.svg";
import { EmptyLayout } from "@/components/layouts/EmptyLayout";
import styles from "./style.module.scss";

const CheckHealth = ({ children }: any) => {
	const { data, isFetched } = useQuery({
		queryKey: ["app-health"],
		queryFn: () => axios.get<boolean>("/api/internal/health"),
		refetchInterval: false,
		retry: 0,
	});

	const { t, getLanguage } = useTolgee();

	if (data?.data === false && isFetched) {
		return (
			<EmptyLayout>
				<div className={styles.container}>
					<Space orientation="vertical" align="center" size="large">
						<div className="logo">
							<GdhubLogo style={{ width: "120px", height: "31px" }} />
						</div>
						<p>
							{t(
								"checkhealth.description",
								"This is a game developers hub for industry professionals whose members form teams to develop new games.",
							)}
						</p>
						<Alert
							type="error"
							message={t(
								"checkhealth.error_no_connection",
								"No connection. Try later.",
							)}
							showIcon
						/>
						<Link
							target="_blank"
							href={
								getLanguage() == "ru"
									? "https://t.me/gdhub_io"
									: "https://t.me/gdhub_en"
							}
						>
							<Button
								style={{ marginTop: 32 }}
								icon={
									<TbBrandTelegram
										size={24}
										style={{ position: "relative", marginRight: 5 }}
									/>
								}
							>
								{t("checkhealth.go_to_chat", "Go to chat")}
							</Button>
						</Link>
					</Space>
				</div>
			</EmptyLayout>
		);
	}

	return children;
};

export default CheckHealth;
