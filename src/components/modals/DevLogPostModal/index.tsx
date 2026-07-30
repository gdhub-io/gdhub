import type { OutputData } from "@editorjs/editorjs";
import type { Prisma, ProjectReport } from "@gdhub-io/gdhub-prisma";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Modal } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useState } from "react";

const DevLogPostEditor = dynamic(() => import("./DevLogPostEditor"), {
	ssr: false,
});

interface DevLogPostModalProps {
	postId?: string;
	projectId: string;
	open: boolean;
	onClose: () => void;
	onSave: () => void;
}

export const DevLogPostModal = ({
	postId,
	projectId,
	open,
	onClose,
	onSave,
}: DevLogPostModalProps) => {
	const { t } = useTranslate();
	const [contentEditor, setContentEditor] = useState<OutputData | undefined>(
		undefined,
	);

	const { mutateAsync: createProjectReport, isPending: isCreating } =
		useMutation({
			mutationFn: (data: Omit<Partial<ProjectReport>, "id">) =>
				axios.post<void>("/api/user/project/report", data),
		});

	const { mutateAsync: updateProjectReport, isPending: isUpdating } =
		useMutation({
			mutationFn: (data: Partial<ProjectReport>) =>
				axios.put<void>("/api/user/project/report", data),
		});

	const handleSaveDevLogPost = async () => {
		if (!contentEditor) return;

		if (!postId) {
			await createProjectReport({
				projectId,
				content: "",
				contentEditor: contentEditor as unknown as Prisma.JsonObject,
			});
		} else {
			await updateProjectReport({
				id: postId,
				content: "",
				contentEditor: contentEditor as unknown as Prisma.JsonObject,
			});
		}

		onSave();
	};

	return (
		<Modal
			// title={t("modal.dev-log-post.title", "DevLog Post Editor")}
			width={800}
			destroyOnHidden
			confirmLoading={isCreating || isUpdating}
			centered
			mask={{ closable: false }}
			okText={t("modal.dev-log-post.save", "Save")}
			cancelText={t("modal.dev-log-post.cancel", "Cancel")}
			open={open}
			onCancel={onClose}
			onOk={handleSaveDevLogPost}
		>
			<DevLogPostEditor postId={postId} onContentChange={setContentEditor} />
		</Modal>
	);
};
