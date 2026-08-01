import type {
	Lecture,
	LecturerRequest,
	Speciality,
	User,
} from "@gdhub-io/gdhub-prisma";
import { useTranslate } from "@tolgee/react";
import { Alert, Avatar, Card } from "antd";
import dayjs from "dayjs";
import { Fragment, useMemo } from "react";
import YouTube from "react-youtube";
import { TextWithLineBreak } from "@/components/TextWithLineBreak";
import styles from "./style.module.scss";

export const HeldContent = ({
	lecture,
}: {
	lecture: Lecture & {
		lecturerRequests: (LecturerRequest & {
			user: User & { specialities: Speciality[] };
		})[];
	};
}) => {
	const { t } = useTranslate();
	const lecturer = useMemo(
		() => lecture.lecturerRequests?.find((r) => r.isSpeaker == true),
		[lecture],
	);

	const lectureAvatar = () => {
		const image = lecturer?.user.image;
		return image ? <Avatar shape="square" size={64} src={image} /> : null;
	};

	return (
		<>
			{lecture.recordLink ? (
				<YouTube
					className={styles.videoCover}
					videoId={lecture.recordLink}
					opts={{ playerVars: { disablekb: 1, autoplay: 0 } }}
				/>
			) : (
				<Alert
					type="warning"
					title={t("modal.lecturedetails.noVideoYet", "No video yet")}
					style={{ marginBottom: 16 }}
				/>
			)}
			<h2>{lecture.name}</h2>
			<div className="lecture-date">
				{t("modal.lecturedetails.passed", "Passed")}:{" "}
				{lecture?.date ? dayjs(lecture.date).format("lll") : null}
			</div>
			<div style={{ marginTop: 16 }}>
				{t(
					"modal.lecturedetails.contentsOfTheLecture",
					"Contents of the lecture",
				)}
				:
			</div>
			<div className="lecture-description">
				<TextWithLineBreak text={lecturer?.curriculum} />
			</div>

			{!!lecturer && (
				<>
					<div style={{ marginTop: 16 }}>
						{t("modal.lecturedetails.lecturer", "Lecturer")}:
					</div>
					<Card style={{ marginTop: 8 }}>
						<Card.Meta
							avatar={lectureAvatar()}
							title={lecturer.user.name}
							description={
								<>
									{lecturer.user.specialities
										? lecturer.user.specialities.map((s: any) => (
												<Fragment key={s.name}>
													{s.name} ({s.level})
													<br />
												</Fragment>
											))
										: t(
												"modal.lecturedetails.communityMember",
												"Community Member",
											)}
								</>
							}
						/>
					</Card>
				</>
			)}
		</>
	);
};
