"use client";

import { IconHistory } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { AdviceRequestsSkeleton } from "@/components/MyAdviceRequests/AdviceRequestsSkeleton";
import styles from "./style.module.scss";

const MyAdviceRequests = dynamic(
	() => import("@/components/MyAdviceRequests"),
	{ ssr: false, loading: () => <AdviceRequestsSkeleton /> },
);
const UserAdviceArchiveModal = dynamic(
	() => import("@/components/modals/UserAdviceArchiveModal"),
	{ ssr: false },
);

export default function MyRequestsClient() {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [showArchive, setShowArchive] = useState(false);

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("expert-requests.myRequests", "Advice Requests")}
				extra={
					<Button
						type="text"
						icon={<IconHistory />}
						onClick={() => setShowArchive(true)}
						aria-label="Archive"
						title={t("Archive")}
					>
						{t("Archive")}
					</Button>
				}
				showBackButton
				backButtonUrl="/hub/experts"
			/>
			<div className={styles.container}>
				<MyAdviceRequests showTitle={false} />
			</div>

			<UserAdviceArchiveModal
				open={showArchive}
				user={session?.user}
				onClose={() => setShowArchive(false)}
			/>
		</div>
	);
}
