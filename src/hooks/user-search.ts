import { useQuery } from "@tanstack/react-query";
import type { SelectProps } from "antd";
import axios from "axios";
import debounce from "lodash/debounce";
import { useMemo, useState } from "react";

type UserOption = {
	id: string;
	name?: string | null;
	email?: string | null;
};

/** Props for an antd Select that finds any user, the admin included, by name or email. */
export const useUserSearch = (enabled = true) => {
	const [search, setSearch] = useState("");
	const { data: users = [], isFetching } = useQuery({
		queryKey: ["user-search", search],
		queryFn: () =>
			axios
				.get<UserOption[]>("/api/users/search", {
					params: { q: search, includeSelf: true },
				})
				.then((res) => res.data),
		enabled,
	});
	const onSearch = useMemo(
		() => debounce((value: string) => setSearch(value), 400),
		[],
	);

	return {
		showSearch: true,
		filterOption: false,
		loading: isFetching,
		onSearch,
		options: users.map((user) => ({
			label: user.name || user.email || user.id,
			value: user.id,
		})),
	} satisfies SelectProps;
};
