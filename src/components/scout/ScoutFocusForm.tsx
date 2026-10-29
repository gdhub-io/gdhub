"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Form, Select } from "antd";
import axios from "axios";
import { toOptions } from "@/helpers/select";
import type { ScoutFacets } from "@/repositories/scout/games";
import type { ScoutCabinet } from "@/repositories/scout/scout";
import { ScoutSettingsCard } from "./ScoutSettingsCard";
import { useCabinetMutation } from "./useCabinetMutation";

const INTEREST_TYPES = ["Investment (equity)", "Publishing"];

export function ScoutFocusForm({ cabinet }: { cabinet: ScoutCabinet }) {
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const save = useCabinetMutation();

	// The same facets the Games list filters by, so the focus can only name
	// values that actually exist on projects. Its own endpoint: read off the
	// list, `limit` bought nothing — the sort is derived, so the whole capped
	// set was read and estimated to produce three lists of strings.
	const { data: facets } = useQuery<ScoutFacets>({
		queryKey: ["scout", "games", "facets"],
		queryFn: () => axios.get("/api/scout/games/facets").then((res) => res.data),
		staleTime: 5 * 60 * 1000,
	});

	const fields = [
		{
			name: "interestTypes",
			label: t("scout.settings.focus.interest", "Interest type"),
			values: INTEREST_TYPES,
		},
		{
			name: "platforms",
			label: t("scout.settings.focus.platforms", "Platforms"),
			values: facets?.platforms,
		},
		{
			name: "genres",
			label: t("scout.settings.focus.genres", "Genres"),
			values: facets?.genres,
		},
		{
			name: "stages",
			label: t("scout.settings.focus.stages", "Project stage"),
			values: facets?.stages,
		},
	];

	return (
		<ScoutSettingsCard
			title={t("scout.settings.focus.title", "Investment Focus")}
			description={t(
				"scout.settings.focus.description",
				"What you want to see — this powers your Games matching and alerts",
			)}
		>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				initialValues={cabinet}
				onFinish={(values) => save.mutate(values)}
			>
				{fields.map((field) => (
					<Form.Item key={field.name} name={field.name} label={field.label}>
						<Select mode="tags" allowClear options={toOptions(field.values)} />
					</Form.Item>
				))}

				<Flex gap={8}>
					<Button type="primary" htmlType="submit" loading={save.isPending}>
						{t("scout.settings.save", "Save changes")}
					</Button>
					<Button onClick={() => form.resetFields()}>
						{t("scout.settings.cancel", "Cancel")}
					</Button>
				</Flex>
			</Form>
		</ScoutSettingsCard>
	);
}
