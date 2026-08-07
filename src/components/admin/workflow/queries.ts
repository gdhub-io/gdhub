"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { ProjectWorkflowRow } from "@/app/(app)/(spaces)/admin/workflows/ProjectWorkflowsTable";
import type { WorkflowTemplateRow } from "@/app/(app)/(spaces)/admin/workflows/WorkflowTemplatesTable";

/**
 * The two admin workflow lists, as hooks.
 *
 * A query key is shared state: the first caller to mount decides what sits in
 * the cache, and everyone else reads it. When the page and a modal spelled the
 * same key with different `queryFn`s, one of them got an axios response where it
 * expected an array and the modal crashed. Defining each list once removes the
 * chance of that disagreement.
 */

export const workflowTemplatesKey = ["admin", "workflows"] as const;
export const projectWorkflowsKey = ["admin", "project-workflows"] as const;

export function useWorkflowTemplates(enabled = true) {
	return useQuery({
		queryKey: workflowTemplatesKey,
		queryFn: () =>
			axios
				.get<WorkflowTemplateRow[]>("/api/admin/workflows")
				.then((res) => res.data),
		enabled,
	});
}

export function useProjectWorkflows(enabled = true) {
	return useQuery({
		queryKey: projectWorkflowsKey,
		queryFn: () =>
			axios
				.get<ProjectWorkflowRow[]>("/api/admin/project-workflows")
				.then((res) => res.data),
		enabled,
	});
}
