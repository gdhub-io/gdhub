"use client";

import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CoursesList from "@/components/CoursesList";
import styles from "./style.module.scss";

const ProtectedLayout = dynamic(
    () => import("@/layouts/ProtectedLayoutApp").then((m) => m.ProtectedLayout),
    { ssr: false },
);

export default function CoursesPage() {
    const { t } = useTranslate();
    const pathname = usePathname();

    return (
        <ProtectedLayout
            title={t("page.courses.title", "Courses")}
            subTitle={t("page.courses.subTitle", "Invest your time in knowledge")}
            seo={{ openGraph: { type: "website", url: pathname || undefined } }}
            extra={
                <Link href="my">
                    <Button type="text">{t("page.courses.myCourses", "My Courses")}</Button>
                </Link>
            }
        >
            <div className={styles.container}>
                <div className="project-vacancies" style={{ marginTop: 32 }}>
                    <CoursesList location="hub" />
                </div>
            </div>
        </ProtectedLayout>
    );
}


