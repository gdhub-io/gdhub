import { IconSparkles } from "@tabler/icons-react";
import {
	Button,
	Checkbox,
	Flex,
	Form,
	Input,
	InputNumber,
	Modal,
	Select,
	Space,
	Switch,
	Typography,
} from "antd";
import React from "react";
import {
	CONDITION_SOURCE_META,
	PROJECT_CONDITION_FIELDS,
	type WorkflowTaskCondition,
	WorkflowTaskConditionSchema,
} from "@/schemas/workflowTaskCondition";
import { explainCondition } from "@/services/workflow/describeCondition";
import styles from "./TaskEditModal.module.scss";

const { Text } = Typography;

/** Sources whose count can be scoped to the current workflow step. */
const SCOPE_SOURCES = ["devlog_posts", "vacancies", "team_members"];

interface TaskEditModalProps {
	visible: boolean;
	onClose: () => void;
	onSave: (task: any) => void;
	task: any;
	isNew: boolean;
}

type ConditionFormValues = {
	conditionSource?: string;
	conditionMin?: number;
	conditionScope?: "project" | "step";
	conditionFields?: string[];
	conditionFilter?: string;
};

/** Spread a stored condition into flat form fields. */
function conditionToForm(
	condition: WorkflowTaskCondition | null | undefined,
): ConditionFormValues {
	if (!condition) return { conditionSource: undefined };
	const values: ConditionFormValues = { conditionSource: condition.source };
	if ("min" in condition) values.conditionMin = condition.min;
	if ("scope" in condition && condition.scope)
		values.conditionScope = condition.scope;
	if (condition.source === "project_fields")
		values.conditionFields = condition.fields;
	if ("status" in condition && condition.status)
		values.conditionFilter = condition.status;
	if ("type" in condition && condition.type)
		values.conditionFilter = condition.type;
	if ("kind" in condition && condition.kind)
		values.conditionFilter = condition.kind;
	return values;
}

/** Assemble form fields back into a validated condition (or null). */
function formToCondition(
	values: ConditionFormValues,
): WorkflowTaskCondition | null {
	const source = values.conditionSource;
	if (!source) return null;

	const meta = CONDITION_SOURCE_META.find((m) => m.source === source);
	const condition: Record<string, unknown> = { source };

	if (meta?.hasMin) condition.min = values.conditionMin ?? 1;
	if (SCOPE_SOURCES.includes(source) && values.conditionScope)
		condition.scope = values.conditionScope;

	if (source === "project_fields") {
		condition.fields = values.conditionFields ?? [];
	} else if (values.conditionFilter && meta?.filters[0]) {
		condition[meta.filters[0].key] = values.conditionFilter;
	}

	const parsed = WorkflowTaskConditionSchema.safeParse(condition);
	return parsed.success ? parsed.data : null;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
	visible,
	onClose,
	onSave,
	task,
	isNew,
}) => {
	const [form] = Form.useForm();
	const values = Form.useWatch([], form) as ConditionFormValues | undefined;
	const source = values?.conditionSource;
	const sourceMeta = CONDITION_SOURCE_META.find((m) => m.source === source);
	const filterMeta = sourceMeta?.filters.find((f) => f.key !== "fields");

	// The switch is the presence of a rule, not a field of its own: turning it on
	// has to leave the panel in a state the admin can immediately read.
	const [autoChecked, setAutoChecked] = React.useState(false);

	React.useEffect(() => {
		if (!visible) return;
		const condition = conditionToForm(task?.condition);
		setAutoChecked(Boolean(condition.conditionSource));
		form.setFieldsValue({
			name: task?.name || task?.title || "",
			description: task?.description || "",
			required: task?.required || false,
			...condition,
		});
	}, [visible, task, form]);

	const toggleAuto = (checked: boolean) => {
		setAutoChecked(checked);
		form.setFieldsValue(
			checked
				? { conditionSource: "devlog_posts", conditionMin: 1 }
				: {
						conditionSource: undefined,
						conditionMin: undefined,
						conditionScope: undefined,
						conditionFields: undefined,
						conditionFilter: undefined,
					},
		);
	};

	const preview = React.useMemo(() => {
		if (!autoChecked) {
			return "Nobody is watching this task — an admin marks it done by hand.";
		}
		const condition = formToCondition(values ?? {});
		if (!condition) {
			return "Finish the rule above and it will be checked automatically.";
		}
		return explainCondition(condition as PrismaJson.WorkflowTaskCondition);
	}, [autoChecked, values]);

	const handleSave = async () => {
		try {
			const submitted = await form.validateFields();
			const {
				conditionSource,
				conditionMin,
				conditionScope,
				conditionFields,
				conditionFilter,
				...rest
			} = submitted;
			onSave({
				...rest,
				condition: autoChecked
					? formToCondition({
							conditionSource,
							conditionMin,
							conditionScope,
							conditionFields,
							conditionFilter,
						})
					: null,
			});
			onClose();
		} catch (error) {
			console.error("Validation failed:", error);
		}
	};

	const handleClose = () => {
		form.resetFields();
		onClose();
	};

	return (
		<Modal
			title={isNew ? "New task" : "Edit task"}
			open={visible}
			onCancel={handleClose}
			width={600}
			centered
			destroyOnHidden
			mask={{ closable: false }}
			footer={
				<Space>
					<Button onClick={handleClose}>Cancel</Button>
					<Button type="primary" onClick={handleSave}>
						{isNew ? "Create" : "Save"}
					</Button>
				</Space>
			}
		>
			<Form form={form} layout="vertical" variant="filled" requiredMark={false}>
				<Form.Item
					name="name"
					label="Task name"
					rules={[
						{ required: true, message: "Enter a task name" },
						{ max: 200, message: "Up to 200 characters" },
					]}
				>
					<Input
						maxLength={200}
						placeholder="e.g. Publish a devlog about the prototype"
					/>
				</Form.Item>

				<Form.Item
					name="description"
					label={
						<>
							Task description&nbsp;
							<span className={styles.optional}>(optional)</span>
						</>
					}
					rules={[{ max: 600, message: "Up to 600 characters" }]}
				>
					<Input.TextArea
						rows={3}
						maxLength={600}
						showCount
						placeholder="Optional longer description shown under the task name"
					/>
				</Form.Item>

				<Form.Item name="required" valuePropName="checked">
					<Checkbox>Required task</Checkbox>
				</Form.Item>

				<Flex
					align="flex-start"
					justify="space-between"
					gap={16}
					className={styles.conditionHeader}
				>
					<Flex vertical gap={2}>
						<Text strong>Completion condition</Text>
						<Text type="secondary" className={styles.conditionSubtitle}>
							The platform marks the task done from the project&rsquo;s own data
						</Text>
					</Flex>
					<Switch checked={autoChecked} onChange={toggleAuto} />
				</Flex>

				{autoChecked && (
					<div className={styles.conditionPanel}>
						<Flex align="center" gap={8} wrap className={styles.sentence}>
							<Text>Mark done when</Text>
							<Form.Item name="conditionSource" noStyle>
								<Select
									className={styles.sourceSelect}
									options={CONDITION_SOURCE_META.map((m) => ({
										value: m.source,
										label: m.label,
									}))}
								/>
							</Form.Item>

							{source === "project_fields" ? (
								<>
									<Text>are all filled:</Text>
									<Form.Item name="conditionFields" noStyle>
										<Select
											mode="multiple"
											allowClear
											placeholder="Select fields"
											className={styles.fieldsSelect}
											options={PROJECT_CONDITION_FIELDS.map((f) => ({
												value: f,
												label: f,
											}))}
										/>
									</Form.Item>
								</>
							) : (
								<>
									<Text>count is at least</Text>
									<Form.Item name="conditionMin" noStyle>
										<InputNumber min={1} className={styles.minInput} />
									</Form.Item>
								</>
							)}

							{source && SCOPE_SOURCES.includes(source) && (
								<>
									<Text>counted within</Text>
									<Form.Item name="conditionScope" noStyle>
										<Select
											className={styles.filterSelect}
											placeholder="the whole project"
											allowClear
											options={[
												{ value: "project", label: "the whole project" },
												{ value: "step", label: "the current step" },
											]}
										/>
									</Form.Item>
								</>
							)}

							{filterMeta && (
								<>
									<Text>and {filterMeta.label.toLowerCase()} is</Text>
									<Form.Item name="conditionFilter" noStyle>
										<Select
											allowClear
											placeholder="any"
											className={styles.filterSelect}
											options={filterMeta.options}
										/>
									</Form.Item>
								</>
							)}
						</Flex>
					</div>
				)}

				<Flex gap={8} align="flex-start" className={styles.explain}>
					<IconSparkles size={14} className={styles.explainIcon} />
					<span>{preview}</span>
				</Flex>
			</Form>
		</Modal>
	);
};

export default TaskEditModal;
