import {
	Button,
	Checkbox,
	Col,
	Divider,
	Form,
	Input,
	InputNumber,
	Modal,
	Row,
	Select,
	Space,
} from "antd";
import React from "react";
import {
	CONDITION_SOURCE_META,
	PROJECT_CONDITION_FIELDS,
	type WorkflowTaskCondition,
	WorkflowTaskConditionSchema,
} from "@/schemas/workflowTaskCondition";

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
	const source = Form.useWatch("conditionSource", form);
	const sourceMeta = CONDITION_SOURCE_META.find((m) => m.source === source);
	const filterMeta = sourceMeta?.filters.find((f) => f.key !== "fields");

	React.useEffect(() => {
		if (visible) {
			form.setFieldsValue({
				name: task?.name || task?.title || "",
				description: task?.description || "",
				required: task?.required || false,
				...conditionToForm(task?.condition),
			});
		}
	}, [visible, task, form]);

	const handleSave = async () => {
		try {
			const values = await form.validateFields();
			const {
				conditionSource,
				conditionMin,
				conditionScope,
				conditionFields,
				conditionFilter,
				...rest
			} = values;
			onSave({
				...rest,
				condition: formToCondition({
					conditionSource,
					conditionMin,
					conditionScope,
					conditionFields,
					conditionFilter,
				}),
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
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				requiredMark="optional"
			>
				<Row gutter={[16, 16]}>
					<Col span={24}>
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
								showCount
								placeholder="e.g. Publish a devlog about the prototype"
							/>
						</Form.Item>
					</Col>
					<Col span={24}>
						<Form.Item
							name="description"
							label="Task description"
							rules={[{ max: 500, message: "Up to 500 characters" }]}
						>
							<Input.TextArea
								rows={2}
								maxLength={500}
								showCount
								placeholder="Optional longer description shown under the task name"
							/>
						</Form.Item>
					</Col>
					<Col span={24}>
						<Form.Item name="required" valuePropName="checked">
							<Checkbox>Required task</Checkbox>
						</Form.Item>
					</Col>
				</Row>

				<Divider style={{ margin: "8px 0 16px" }}>
					Completion condition (checked by the platform)
				</Divider>

				<Row gutter={[16, 16]}>
					<Col span={24}>
						<Form.Item
							name="conditionSource"
							label="Source (model)"
							tooltip="The task is marked done automatically from project data. Empty — no auto-check."
						>
							<Select
								allowClear
								placeholder="No auto-check"
								options={CONDITION_SOURCE_META.map((m) => ({
									value: m.source,
									label: m.label,
								}))}
							/>
						</Form.Item>
					</Col>

					{source === "project_fields" && (
						<Col span={24}>
							<Form.Item name="conditionFields" label="Fields must be filled">
								<Select
									mode="multiple"
									allowClear
									placeholder="Select fields"
									options={PROJECT_CONDITION_FIELDS.map((f) => ({
										value: f,
										label: f,
									}))}
								/>
							</Form.Item>
						</Col>
					)}

					{sourceMeta?.hasMin && (
						<Col xs={24} lg={8}>
							<Form.Item name="conditionMin" label="Minimum (≥)">
								<InputNumber
									min={1}
									style={{ width: "100%" }}
									placeholder="1"
								/>
							</Form.Item>
						</Col>
					)}

					{source && SCOPE_SOURCES.includes(source) && (
						<Col xs={24} lg={8}>
							<Form.Item name="conditionScope" label="Scope">
								<Select
									allowClear
									placeholder="project"
									options={[
										{ value: "project", label: "Whole project" },
										{ value: "step", label: "Current step" },
									]}
								/>
							</Form.Item>
						</Col>
					)}

					{filterMeta && (
						<Col xs={24} lg={8}>
							<Form.Item name="conditionFilter" label={filterMeta.label}>
								<Select
									allowClear
									placeholder="Any"
									options={filterMeta.options}
								/>
							</Form.Item>
						</Col>
					)}
				</Row>
			</Form>
		</Modal>
	);
};

export default TaskEditModal;
