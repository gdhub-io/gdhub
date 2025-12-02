import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const CoursesList = dynamic(
	() => import("@/components/CoursesList").then((m) => m.default),
	{ ssr: false },
);

const CoursesPage: NextPageWithLayout = ({ projects }: any) => {
	const router = useRouter();
	const { t } = useTranslate();

	return (
		<ProtectedLayout
			title={t("page.courses.title", "Courses")}
			subTitle={t("page.courses.subTitle", "Invest your time in knowledge")}
			seo={{ openGraph: { type: "website", url: router.asPath } }}
			extra={
				<Link href="/hub/courses/my">
					<Button type="text">
						{t("page.courses.myCourses", "My Courses")}
					</Button>
				</Link>
			}
		>
			<div className={styles.container}>
				<div className="courses-list" style={{ marginTop: 32 }}>
					<CoursesList location="hub" />
				</div>
			</div>
		</ProtectedLayout>
	);
};

export default CoursesPage;
