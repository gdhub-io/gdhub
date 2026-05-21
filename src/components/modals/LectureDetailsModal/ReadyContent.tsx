import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTranslate } from "@tolgee/react";
import { Avatar, Button, Card, Space } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Fragment, useMemo } from "react";
import { TextWithLineBreak } from "@/components/TextWithLineBreak";
import type { LectureDetails } from ".";

export const ReadyContent = ({ lecture }: { lecture: LectureDetails }) => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const lecturer = useMemo(
		() =>
			lecture.lecturerRequests.find(
				(r: prismaClient.LecturerRequest) => r.userId == session?.user.id,
			),
		[lecture],
	);
	const userIsRegistered = useMemo(
		() => lecture.listeners.find((r) => r.userId == session?.user.id),
		[lecture],
	);

	const lectureAvatar = () => {
		const image = lecturer?.user.image;
		return image ? <Avatar shape="square" size={64} src={image} /> : null;
	};

	return (
		<>
			<h2>{lecture.name}</h2>
			<div className="lecture-date">
				{t("lecture.when", "When")}:{" "}
				{!!lecturer?.date && dayjs(lecturer.date).format("dd LLL YYYY, hh:mm")}{" "}
				({t("lecture.online", "online")})
			</div>
			<div style={{ marginTop: 16 }}>
				{t("lecture.whatWillHappen", "What will happen")}:
			</div>
			<div className="lecture-description">
				<TextWithLineBreak text={lecturer?.curriculum} />
			</div>

			{!!lecturer && (
				<>
					<div style={{ marginTop: 16 }}>
						{t("lecture.lecturer", "Lecturer")}:
					</div>
					<Card style={{ marginTop: 8 }}>
						<Card.Meta
							avatar={lectureAvatar()}
							title={lecturer.user.name}
							description={
								<>
									{lecturer.user.specialities
										? lecturer.user.specialities.map((s: any) => (
												<Fragment key={s.Name}>
													{s.Name} ({s.Level})
													<br />
												</Fragment>
											))
										: t("lecture.communityMember", "Community member")}
								</>
							}
						/>
					</Card>
				</>
			)}

			{!!lecturer?.linkToStream && userIsRegistered && (
				<Space wrap orientation="vertical">
					<Link href={lecturer.linkToStream} target="_blank">
						<Button type="primary" style={{ marginTop: 16 }}>
							{t("lecture.linkToStream", "Link to stream")}
						</Button>
					</Link>
					<small>
						{t(
							"lecture.followThisLinkBeforeTheLecture",
							"Follow this link before the lecture",
						)}
					</small>
				</Space>
			)}
		</>
	);
};
