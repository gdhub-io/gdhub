import type { OutputData } from "@editorjs/editorjs";
import type { Prisma, ProjectReport } from "@gdhub-io/gdhub-prisma";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import axios, { isAxiosError } from "axios";
import { useSession } from "next-auth/react";
import { useDevlogName } from "@/hooks/useDevlogName";
import { ComposerView } from "./ComposerView";

type EditablePost = ProjectReport & {
	author: { name: string | null; image: string | null } | null;
	step: { name: string } | null;
};

interface DevLogPostModalProps {
	postId?: string;
	projectId: string;
	projectName: string;
	/** The project's current stage — where a new post will be filed. */
	stageName?: string;
	/** The number a new post will take: the project's last one plus one. */
	nextNumber: number;
	open: boolean;
	onClose: () => void;
	onSave: () => void;
}

export const DevLogPostModal = ({
	postId,
	projectId,
	projectName,
	stageName,
	nextNumber,
	open,
	onClose,
	onSave,
}: DevLogPostModalProps) => {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { data: session } = useSession();
	const devlogName = useDevlogName();

	const { data: post, isLoading } = useQuery({
		queryKey: ["devlog-post-editor", postId],
		queryFn: () =>
			axios
				.get<EditablePost>("/api/user/project/report", {
					params: { id: postId },
				})
				.then((res) => res.data),
		enabled: open && !!postId,
		// Never reopen a post on the text it had before the last save.
		gcTime: 0,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: saveReport, isPending } = useMutation({
		mutationFn: (contentEditor: OutputData) => {
			const data = {
				content: "",
				contentEditor: contentEditor as unknown as Prisma.JsonObject,
			};

			return postId
				? axios.put<void>("/api/user/project/report", { id: postId, ...data })
				: axios.post<void>("/api/user/project/report", { projectId, ...data });
		},
	});

	const handleSubmit = async (content: OutputData) => {
		try {
			await saveReport(content);
			onSave();
		} catch (error) {
			message.error(
				(isAxiosError(error) && error.response?.data?.message) ||
					t("modal.dev-log-post.error", "The post could not be saved"),
			);
		}
	};

	// An existing post keeps the stage it was filed under, not the current one.
	const stage = postId ? post?.step?.name : stageName;

	return (
		<ComposerView
			open={open}
			author={postId ? (post?.author ?? undefined) : session?.user}
			context={[
				projectName,
				stage,
				// Still loading: the post's own number is not known yet.
				postId ? post && devlogName(post.number) : devlogName(nextNumber),
			]
				.filter(Boolean)
				.join(" · ")}
			editing={!!postId}
			loading={isLoading}
			saving={isPending}
			initialData={(post?.contentEditor ?? undefined) as OutputData | undefined}
			onCancel={onClose}
			onSubmit={handleSubmit}
		/>
	);
};
