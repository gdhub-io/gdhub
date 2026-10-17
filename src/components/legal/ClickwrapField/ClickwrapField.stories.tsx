import type { Meta, StoryObj } from "@storybook/nextjs";
import { Button, Form } from "antd";
import { useEffect } from "react";
import { ClickwrapField, clickwrapFieldName } from "./index";

type Args = {
	ticked?: boolean;
	submitted?: boolean;
	stale?: boolean;
};

function Demo({ ticked, submitted, stale }: Args) {
	const [form] = Form.useForm();
	useEffect(() => {
		form.setFieldValue(clickwrapFieldName("TermsOfUse"), Boolean(ticked));
		if (submitted) form.validateFields().catch(() => undefined);
	}, [form, ticked, submitted]);
	return (
		<Form form={form} layout="vertical" style={{ width: 420 }}>
			<ClickwrapField code="TermsOfUse" stale={stale} />
			<Button type="primary" htmlType="submit" style={{ marginTop: 16 }}>
				Create account
			</Button>
		</Form>
	);
}

/** Frame `rUE26`: the four states of the one checkbox every acceptance goes through. */
const meta: Meta<typeof Demo> = {
	title: "Legal/ClickwrapField",
	component: Demo,
	parameters: { layout: "centered" },
};

export default meta;

type Story = StoryObj<typeof Demo>;

/** `X55GY` — never pre-ticked. */
export const Unticked: Story = {};

/** `ywR1g` */
export const Ticked: Story = { args: { ticked: true } };

/** `XV8kw` — submitted without the tick. */
export const NotAccepted: Story = { args: { submitted: true } };

/** `lmRUq` — the server refused the version the box showed; it unticks and says why. */
export const TextUpdated: Story = { args: { stale: true } };
