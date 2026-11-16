"use client";

import { IconDeviceDesktop } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Form, Input, Typography } from "antd";
import { useEffect } from "react";
import {
	SBORKA_DEFAULT_RTMP_URL,
	SBORKA_SETTINGS_STORAGE_KEY,
} from "@/config/live";
import styles from "./style.module.scss";

export type BroadcastSettingsValues = {
	title: string;
	rtmpUrl: string;
	streamKey: string;
};

const stored = (): Partial<BroadcastSettingsValues> => {
	try {
		return JSON.parse(
			localStorage.getItem(SBORKA_SETTINGS_STORAGE_KEY) ?? "{}",
		);
	} catch {
		return {};
	}
};

/**
 * Frame 03.15.1 (`F6CLy`): the show title and the RTMP target, remembered in
 * this browser. On air only the title stays editable.
 */
export function BroadcastSettings({
	live,
	onChange,
}: {
	live: boolean;
	onChange: (values: BroadcastSettingsValues) => void;
}) {
	const { t } = useTranslate();
	const [form] = Form.useForm<BroadcastSettingsValues>();

	// biome-ignore lint/correctness/useExhaustiveDependencies: read once on mount
	useEffect(() => {
		const values = {
			title: "",
			rtmpUrl: SBORKA_DEFAULT_RTMP_URL,
			streamKey: "",
			...stored(),
		};
		form.setFieldsValue(values);
		onChange(values);
	}, []);

	const changed = (_: unknown, values: BroadcastSettingsValues) => {
		localStorage.setItem(SBORKA_SETTINGS_STORAGE_KEY, JSON.stringify(values));
		onChange(values);
	};

	return (
		<section className={styles.panel}>
			<div className={styles.panelHead}>
				<Typography.Title level={5} className={styles.title}>
					{t("live.sborka.broadcast", "Broadcast")}
				</Typography.Title>
			</div>
			<div className={styles.panelBody}>
				<Form
					form={form}
					layout="vertical"
					variant="filled"
					requiredMark={false}
					onValuesChange={changed}
					className={styles.form}
				>
					<Form.Item
						name="title"
						label={t("live.sborka.showTitle", "Show title")}
						extra={t(
							"live.sborka.showTitleHelp",
							"Shown in the top bar of the broadcast.",
						)}
						className={styles.formWide}
					>
						<Input maxLength={80} />
					</Form.Item>
					<Form.Item
						name="rtmpUrl"
						label={t("live.sborka.rtmpUrl", "RTMP URL")}
					>
						<Input disabled={live} placeholder={SBORKA_DEFAULT_RTMP_URL} />
					</Form.Item>
					<Form.Item
						name="streamKey"
						label={t("live.sborka.streamKey", "Stream key")}
					>
						<Input.Password
							disabled={live}
							placeholder={t(
								"live.sborka.streamKeyHint",
								"From YouTube Studio or similar",
							)}
						/>
					</Form.Item>
				</Form>
				<span className={styles.help}>
					<IconDeviceDesktop size={14} />
					{t(
						"live.sborka.remembered",
						"RTMP URL, key and title are remembered in this browser.",
					)}
				</span>
			</div>
		</section>
	);
}
