import type {
	GameGenre,
	GameSetting,
	WorkDirection,
} from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";

export const useWorkDirections = () => {
	const { data: records } = useQuery({
		queryKey: ["workDirections"],
		queryFn: () =>
			axios.get<WorkDirection[]>("/api/dictionary/work-directions"),
		staleTime: Infinity,
	});

	const options = useMemo(() => {
		if (!records) return;

		return records.data.map((dir) => ({ value: dir.id, label: dir.name }));
	}, [records]);

	const getDirectionName = (workDirectionId: string) =>
		records?.data.find((r) => r.id == workDirectionId)?.name;

	return { data: records?.data, options, getDirectionName };
};

export const useGameGenres = () => {
	const { data: records } = useQuery({
		queryKey: ["gameGenres"],
		queryFn: () => axios.get<GameGenre[]>("/api/dictionary/game-genres"),
		staleTime: Infinity,
	});

	const options = useMemo(() => {
		if (!records) return;

		return records.data.map((dir) => ({ value: dir.id, label: dir.name }));
	}, [records]);

	const getGameGenreName = (gameGenreId: string) =>
		records?.data.find((r) => r.id == gameGenreId)?.name;

	return { data: records?.data, options, getGameGenreName };
};

export const useGameSettings = () => {
	const { data: records } = useQuery({
		queryKey: ["gameSettings"],
		queryFn: () => axios.get<GameSetting[]>("/api/dictionary/game-settings"),
		staleTime: Infinity,
	});

	const options = useMemo(() => {
		if (!records) return;

		return records.data.map((dir) => ({ value: dir.id, label: dir.name }));
	}, [records]);

	const getGameSettingName = (gameSettingId: string) =>
		records?.data.find((r) => r.id == gameSettingId)?.name;

	return { data: records?.data, options, getGameSettingName };
};

export const useGameDifficulties = () => {
	const { data: records } = useQuery({
		queryKey: ["gameDifficulties"],
		queryFn: () => axios.get<GameGenre[]>("/api/dictionary/game-levels"),
		staleTime: Infinity,
	});

	const options = useMemo(() => {
		if (!records) return;

		return records.data.map((dir) => ({ value: dir.id, label: dir.name }));
	}, [records]);

	const getGameDifficultyName = (gameDifficultyId: string) =>
		records?.data.find((r) => r.id == gameDifficultyId)?.name;

	return { data: records?.data, options, getGameDifficultyName };
};
