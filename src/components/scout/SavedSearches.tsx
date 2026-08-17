"use client";

import { IconBookmark, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button, Dropdown, Flex, Input } from "antd";
import axios from "axios";
import { useState } from "react";

export type SavedSearch = {
	id: string;
	name: string;
	query: string | null;
	platforms: string[];
	genres: string[];
	stages: string[];
};

type Current = {
	query: string;
	platforms: string[];
	genres: string[];
	stages: string[];
};

/** Save the current filters under a name, and put a saved set back on. */
export function SavedSearches({
	current,
	onApply,
}: {
	current: Current;
	onApply: (search: SavedSearch) => void;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const queryClient = useQueryClient();
	const [name, setName] = useState("");

	const { data: searches = [] } = useQuery<SavedSearch[]>({
		queryKey: ["scout", "saved-searches"],
		queryFn: () =>
			axios.get("/api/scout/saved-searches").then((res) => res.data),
	});

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["scout", "saved-searches"] });

	const save = useMutation({
		mutationFn: () =>
			axios.post("/api/scout/saved-searches", { name, ...current }),
		onSuccess: () => {
			setName("");
			invalidate();
			message.success(t("scout.games.saved", "Search saved"));
		},
	});

	const remove = useMutation({
		mutationFn: (id: string) => axios.delete(`/api/scout/saved-searches/${id}`),
		onSuccess: invalidate,
	});

	const items = [
		...searches.map((search) => ({
			key: search.id,
			label: (
				<Flex align="center" justify="space-between" gap={12}>
					<button type="button" onClick={() => onApply(search)}>
						{search.name}
					</button>
					<Button
						type="text"
						size="small"
						icon={<IconTrash size={14} />}
						onClick={(event) => {
							event.stopPropagation();
							remove.mutate(search.id);
						}}
					/>
				</Flex>
			),
		})),
		{ type: "divider" as const },
		{
			key: "new",
			label: (
				<Flex gap={8} onClick={(event) => event.stopPropagation()}>
					<Input
						size="small"
						placeholder={t("scout.games.saveName", "Name this search")}
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
					<Button
						size="small"
						type="primary"
						disabled={!name.trim()}
						loading={save.isPending}
						onClick={() => save.mutate()}
					>
						{t("scout.games.save", "Save")}
					</Button>
				</Flex>
			),
		},
	];

	return (
		<Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
			<Button icon={<IconBookmark size={16} />}>
				{t("scout.games.savedSearches", "Saved searches")}
			</Button>
		</Dropdown>
	);
}
