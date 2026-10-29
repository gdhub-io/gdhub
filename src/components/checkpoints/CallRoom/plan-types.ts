import type { CheckpointCallDto } from "@/types/checkpoint-call";

/** What the plan editor needs, from a call or from an AI review page. */
export type Plan = Pick<CheckpointCallDto["plan"], "edit" | "tasks">;
export type Task = Plan["tasks"][number];
