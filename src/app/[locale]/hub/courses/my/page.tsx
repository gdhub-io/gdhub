"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Typography, theme } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import React from "react";
import { CourseCard, CourseSection } from "@/components/courses";
import styles from "./style.module.scss";

const { Paragraph } = Typography;

const ProtectedLayout = dynamic(
    () => import("@/layouts/ProtectedLayoutApp").then((m) => m.ProtectedLayout),
    { ssr: false },
);

export default function MyCoursesPage() {
    const { t } = useTranslate();
    const { token } = theme.useToken();

    const { data: myCourses, isSuccess, isLoading } = useQuery({
        queryKey: ["my-courses"],
        queryFn: () => axios.get("/api/user/courses").then((res) => res.data),
    });

    return (
        <ProtectedLayout
            title={t("courses.myCourses", "My courses")}
            subTitle={t("courses.myCoursesDescription", "Courses where you are an author, student, or instructor")}
            extra={<Button>{t("courses.createCourse", "Create course")}</Button>}
            showBackButton
            backButtonUrl="../"
        >
            <div className={styles.container}>
                <CourseSection
                    CardComponent={CourseCard}
                    token={token}
                    queryKey={["my-courses"]}
                    queryFn={() => axios.get("/api/user/courses").then((res) => res.data)}
                />

                {!isSuccess && !isLoading && (
                    <Paragraph type="secondary">
                        {t("courses.noMyCourses", "You are not enrolled in any courses yet")}
                    </Paragraph>
                )}
            </div>
        </ProtectedLayout>
    );
}


