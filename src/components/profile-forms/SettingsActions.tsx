"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex } from "antd";
import styles from "./settingsActions.module.scss";

/**
 * The Save button under a settings panel.
 *
 * Shared because it was four copies of the same three lines carrying four
 * different translation keys for the word "Save" — one of them the word itself
 * used as a key. A person moving between the settings tabs sees one button, so
 * there is one of it here.
 */
export function SettingsActions({
	onSave,
	loading,
}: {
	onSave: () => void;
	loading?: boolean;
}) {
	const { t } = useTranslate();

	return (
		<Flex className={styles.actions}>
			<Button type="primary" onClick={onSave} loading={loading}>
				{t("profile.settings.save", "Save")}
			</Button>
		</Flex>
	);
}

export default SettingsActions;
