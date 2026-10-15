"use client";

import type { Speciality, WorkDirection } from "@gdhub-io/gdhub-prisma";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { SkillLevel } from "@/config/prisma-enums";
import type {
	EntryProjectInput,
	EntryProjectPrefillDto,
	EntryStatusDto,
} from "@/types/checkpoints";

export const entryKeys = {
	status: ["checkpoint-entry"] as const,
	prefill: (projectId?: string) =>
		["checkpoint-entry", "project", projectId] as const,
	profile: ["checkpoint-entry", "about", "profile"] as const,
	speciality: ["checkpoint-entry", "about", "speciality"] as const,
};

/** What item 1 saves: the profile basics and the main speciality. */
export type EntryAboutInput = {
	name: string;
	country: string;
	/** The speciality being edited; absent when the user has none yet. */
	specialityId?: string;
	specialityName: string;
	workDirectionId: string;
	level: SkillLevel;
	/** Consents ticked on the registration page, carried in its cookie. */
	agreeWithTermsAndPrivacy?: boolean;
	needSubscribeToNewsletter?: boolean;
};

/** The hub's one read: about you, the projects, the draft item 2 was saved into. */
export const useEntryStatus = () =>
	useQuery({
		queryKey: entryKeys.status,
		queryFn: async () =>
			(await axios.get<EntryStatusDto>("/api/checkpoint/entry")).data,
	});

/** Item 2's lines for a project: saved ones, or carried over from its last checkpoint. */
export const useEntryPrefill = (projectId?: string) =>
	useQuery({
		queryKey: entryKeys.prefill(projectId),
		queryFn: async () =>
			(
				await axios.get<EntryProjectPrefillDto>(
					"/api/checkpoint/entry/project",
					{ params: { projectId } },
				)
			).data,
		enabled: !!projectId,
		// Reopening a project must show what was saved a moment ago, not a cached list.
		staleTime: 0,
	});

export const useSaveEntryProject = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: EntryProjectInput) =>
			(await axios.put<EntryStatusDto>("/api/checkpoint/entry/project", input))
				.data,
		onSuccess: (status, input) => {
			queryClient.setQueryData(entryKeys.status, status);
			queryClient.invalidateQueries({
				queryKey: entryKeys.prefill(input.projectId),
			});
		},
	});
};

export const useSaveEntryAbout = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: EntryAboutInput) =>
			(
				await axios.post<{
					ok: boolean;
					validation?: {
						warnings?: { messageKey: string; message: string }[];
					};
				}>("/api/checkpoint/entry/about", input)
			).data,
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: entryKeys.status }),
				queryClient.invalidateQueries({ queryKey: entryKeys.speciality }),
				queryClient.invalidateQueries({ queryKey: entryKeys.profile }),
			]),
	});
};

/** The profile as onboarding keeps it — the About you form starts from it. */
export const useEntryProfile = () =>
	useQuery({
		queryKey: entryKeys.profile,
		queryFn: async () =>
			(
				await axios.get<{ name: string | null; country: string | null } | null>(
					"/api/auth/registration/onboarding/profile",
				)
			).data,
	});

/** The user's main speciality, for the form and the hub's "name · speciality" line. */
export const useEntrySpeciality = () =>
	useQuery({
		queryKey: entryKeys.speciality,
		queryFn: async () =>
			(
				await axios.get<(Speciality & { direction: WorkDirection }) | null>(
					"/api/auth/registration/onboarding/speciality",
				)
			).data,
	});
