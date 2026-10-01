import type { ProjectArtifact } from "@gdhub-io/gdhub-prisma";
import { IconFolder, IconLink } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Flex,
	Form,
	Input,
	Modal,
	message,
	Segmented,
	Select,
	Typography,
} from "antd";
import axios, { isAxiosError } from "axios";
import {
	ARTIFACT_DESCRIPTION_MAX,
	ARTIFACT_KINDS,
	type ArtifactKind,
	TYPES_OF_KIND,
} from "@/components/MyProjectArtifacts/artifacts";
import {
	KIND_ICON,
	useArtifactKindLabel,
	useArtifactTypeLabel,
} from "@/components/MyProjectArtifacts/labels";
import type { ProjectArtifactType } from "@/config/prisma-enums";
import { gtmEventTrigger } from "@/helpers/gtm";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

const INITIAL_KIND: ArtifactKind = "video";

type ArtifactForm = {
	kind: ArtifactKind;
	type: ProjectArtifactType;
	link: string;
	name: string;
	description?: string;
};

type CreateArtifactModalProps = {
	open: boolean;
	projectId?: string;
	/** The project's current stage — where the artifact will be filed. */
	stageName?: string;
	onCreate: () => void;
	onCancel: () => void;
};

/** Frame `ZKHiF`, minus the file drop: there is no storage for uploads yet. */
const CreateArtifactModal = ({
	open,
	projectId,
	stageName,
	onCreate,
	onCancel,
}: CreateArtifactModalProps) => {
	const { t } = useTranslate();
	const kindLabel = useArtifactKindLabel();
	const typeLabel = useArtifactTypeLabel();
	const [form] = Form.useForm<ArtifactForm>();
	const kind = Form.useWatch("kind", form) ?? INITIAL_KIND;

	const { mutateAsync: createArtifact, isPending } = useMutation({
		mutationFn: ({ kind: _kind, ...artifact }: ArtifactForm) =>
			axios.post<ProjectArtifact>("/api/user/project/artifacts", {
				...artifact,
				projectId,
			}),
	});

	const handleOk = async () => {
		const values = await form.validateFields().catch(() => null);
		if (!values) return;

		try {
			const { data } = await createArtifact(values);
			gtmEventTrigger("artifact_create", { projectId, name: data.name });
			onCreate();
		} catch (error) {
			message.error(
				(isAxiosError(error) && error.response?.data?.message) ||
					t("artifacts.modal.error", "The artifact could not be added"),
			);
		}
	};

	return (
		<Modal
			centered
			destroyOnHidden
			width={720}
			open={open}
			onCancel={onCancel}
			mask={{ closable: false }}
			title={
				<Flex vertical gap={4}>
					<Title level={4} style={{ margin: 0 }}>
						{t("artifacts.modal.title", "Add artifact")}
					</Title>
					{kind === "video" && (
						<Text type="secondary" className={styles.hint}>
							{t(
								"artifacts.modal.videoHint",
								"Videos can be reviewed without running a build.",
							)}
						</Text>
					)}
				</Flex>
			}
			footer={
				<Flex align="center" justify="space-between" gap={12} wrap>
					<Text className={styles.note}>
						{t(
							"artifacts.modal.privacy",
							"Nothing here is public until the project page is.",
						)}
					</Text>
					<Flex gap={8}>
						<Button onClick={onCancel}>
							{t("artifacts.modal.cancel-text", "Cancel")}
						</Button>
						<Button type="primary" loading={isPending} onClick={handleOk}>
							{t("artifacts.add", "Add artifact")}
						</Button>
					</Flex>
				</Flex>
			}
		>
			<Form
				form={form}
				preserve={false}
				variant="filled"
				layout="vertical"
				autoComplete="off"
				requiredMark={false}
				initialValues={{
					kind: INITIAL_KIND,
					type: TYPES_OF_KIND[INITIAL_KIND][0],
				}}
			>
				<Form.Item name="kind" label={t("artifacts.modal.kind.label", "Kind")}>
					<Segmented<ArtifactKind>
						className={styles.kinds}
						options={ARTIFACT_KINDS.map((value) => {
							const KindIcon = KIND_ICON[value];

							return {
								value,
								icon: <KindIcon size={16} stroke={2} />,
								label: kindLabel(value),
							};
						})}
						onChange={(value) =>
							form.setFieldValue("type", TYPES_OF_KIND[value][0])
						}
					/>
				</Form.Item>

				{/* The schema stores a type, not a kind: a kind with one type has nothing to ask. */}
				<Form.Item
					name="type"
					label={t("artifacts.modal.type.label", "Type")}
					hidden={TYPES_OF_KIND[kind].length === 1}
				>
					<Select
						options={TYPES_OF_KIND[kind].map((value) => ({
							value,
							label: typeLabel(value),
						}))}
					/>
				</Form.Item>

				<Form.Item
					name="link"
					label={t("artifacts.modal.link.label", "Link")}
					rules={[{ required: true, type: "url" }]}
					extra={
						kind === "video" &&
						t(
							"artifacts.modal.link.videoHelp",
							"YouTube, Vimeo or a direct link.",
						)
					}
				>
					<Input
						prefix={<IconLink size={16} stroke={2} />}
						placeholder={kind === "video" ? "https://youtu.be/…" : "https://…"}
					/>
				</Form.Item>

				<Form.Item
					name="name"
					label={t("artifacts.modal.name.label", "Name")}
					rules={[{ required: true, whitespace: true }]}
				>
					<Input
						placeholder={t(
							"artifacts.modal.name.placeholder",
							"Prototype walkthrough, 3 min",
						)}
					/>
				</Form.Item>

				<Form.Item
					name="description"
					label={
						<>
							{t("artifacts.modal.description.label", "What it is")}
							<Text type="secondary" className={styles.suffix}>
								{t("artifacts.modal.description.suffix", "2 sentences")}
							</Text>
						</>
					}
				>
					<Input.TextArea
						rows={3}
						maxLength={ARTIFACT_DESCRIPTION_MAX}
						showCount
						placeholder={t(
							"artifacts.modal.description.placeholder",
							"Add context for the curator.",
						)}
					/>
				</Form.Item>

				{stageName && (
					<Flex align="center" gap={10} className={styles.filed}>
						<IconFolder size={16} stroke={2} />
						<Text type="secondary">
							{t("artifacts.modal.filed", "Filed under {stage}", {
								stage: stageName,
							})}
						</Text>
					</Flex>
				)}
			</Form>
		</Modal>
	);
};

export default CreateArtifactModal;
