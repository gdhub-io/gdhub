import { useTranslate } from "@tolgee/react";
import { Modal } from "antd";
import { LEGAL_PREVIEW_MODAL_WIDTH } from "@/config/legal";
import type { ProjectLegalSnapshotInput } from "@/helpers/legal/projectLegalSnapshot";
import ProjectLegalContent from "./ProjectLegalContent";

type ProjectLegalPreviewModalProps = {
	open: boolean;
	onClose: () => void;
	title?: string;
	appendixInput?: ProjectLegalSnapshotInput;
	showProjectAppendix?: boolean;
};

const ProjectLegalPreviewModal = ({
	open,
	onClose,
	title,
	appendixInput,
	showProjectAppendix = false,
}: ProjectLegalPreviewModalProps) => {
	const { t } = useTranslate();

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			width={LEGAL_PREVIEW_MODAL_WIDTH}
			destroyOnHidden
			title={title || t("Co-development agreement preview")}
		>
			{open ? (
				<ProjectLegalContent
					appendixInput={appendixInput}
					showProjectAppendix={showProjectAppendix}
				/>
			) : null}
		</Modal>
	);
};

export default ProjectLegalPreviewModal;
