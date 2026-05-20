"use client";

import { AiOutlineHistory } from "@react-icons/all-files/ai/AiOutlineHistory";
import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useState } from "react";
import styles from "@/pages/hub/experts/my-requests/style.module.scss";

const ProtectedLayout = dynamic(
	() => import("@/layouts/ProtectedLayout").then((m) => m.ProtectedLayout),
	{ ssr: false },
);
const MyAdviceRequests = dynamic(
	() => import("@/components/MyAdviceRequests"),
	{ ssr: false },
);
const UserAdviceArchiveModal = dynamic(
	() => import("@/components/modals/UserAdviceArchiveModal"),
	{ ssr: false },
);

export default function MyExpertRequestsPage() {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [showArchive, setShowArchive] = useState(false);

	return (
		<ProtectedLayout
			title={t("expert-requests.myRequests", "Advice Requests")}
			extra={
				<Button
					type="text"
					icon={<AiOutlineHistory />}
					onClick={() => setShowArchive(true)}
					aria-label="Archive"
					title={t("Archive")}
				>
					{t("Archive")}
				</Button>
			}
			showBackButton
			backButtonUrl="/hub/experts"
		>
			<div className={styles.container}>
				<MyAdviceRequests showTitle={false} />
			</div>

			<UserAdviceArchiveModal
				open={showArchive}
				user={session?.user}
				onClose={() => setShowArchive(false)}
			/>
		</ProtectedLayout>
	);
}
