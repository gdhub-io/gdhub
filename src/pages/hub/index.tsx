import { useTolgee } from "@tolgee/react";
import { Alert, Button, Col, Flex, Grid, Row, Space, Typography } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const ProtectedLayout = dynamic(
	() => import("@/layouts/ProtectedLayout").then((m) => m.ProtectedLayout),
	{ ssr: false },
);
const DevlogPosts = dynamic(() => import("@/components/DevlogPosts"), {
	ssr: false,
});
const MyAdviceRequests = dynamic(
	() => import("@/components/MyAdviceRequests"),
	{ ssr: false },
);
const MyProjectList = dynamic(() => import("@/components/MyProjectList"), {
	ssr: false,
});

const NewMembers = dynamic(() => import("@/components/NewMembers"), {
	ssr: false,
});

const { Title, Text } = Typography;

const HubPage: NextPageWithLayout = () => {
	const session = useSession();
	const router = useRouter();
	const { getLanguage, t } = useTolgee();
	const screens = Grid.useBreakpoint();

	const linkToChat = useMemo(() => {
		let link = "";

		switch (getLanguage()) {
			case "en":
				link = "https://t.me/gdhub_en";
				break;
			case "ru":
				link = "https://t.me/gdhub_io";
				break;
		}

		return link;
	}, [router]);

	return (
		<ProtectedLayout>
			<Row gutter={[24, 24]} className={styles.container}>
				<Col xs={24} md={16} lg={16}>
					<Flex vertical gap={32}>
						<Flex vertical gap={0}>
							<Title level={1}>
								{t("hub.text1", "Hello, {userName} 👋", {
									userName: session?.data?.user.name || "user",
								})}
							</Title>
							<Text>
								{t("hub.text1.part1", "It's a good day for game development")}
							</Text>
						</Flex>

						{session.status == "authenticated" &&
							!session.data.user.onboardingDone && (
								<Alert
									type="warning"
									message={
										<Space direction="vertical">
											<div>
												{t(
													"hub.text1.part1",
													"Now you can get acquainted with our platform, but in order to be able to create your own projects or respond to the vacancies of others, you need to complete the registration by filling in the necessary information about yourself.",
												)}
												<br />
												{t(
													"hub.text1.part2",
													"And don&apos;t forget to join the community chat using",
												)}{" "}
												<Link href={linkToChat} target="_blank">
													this link.
												</Link>
											</div>
											<Link href="/registration/onboarding">
												<Button>
													{t("hub.text1.part3", "Complete Registration")}
												</Button>
											</Link>
										</Space>
									}
								/>
							)}
						{session.status == "authenticated" &&
							!!session.data.user.onboardingDone && (
								<Flex vertical gap={32}>
									<MyProjectList />
									<NewMembers />
									<MyAdviceRequests />
									<DevlogPosts />
								</Flex>
							)}
					</Flex>
				</Col>
				{screens.md && (
					<Col xs={24} md={8} lg={8}>
						<div className={styles.sidebar}>
							{/* Sidebar content will be added here */}
						</div>
					</Col>
				)}
			</Row>
		</ProtectedLayout>
	);
};

export default HubPage;
