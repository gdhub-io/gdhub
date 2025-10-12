"use client";

import { useParams } from "next/navigation";
import { DevLogWall } from "@/components/DevLogWall";

export default function MyProjectDevlogPage() {
  const params = useParams() as { projectSlug: string };
  return <DevLogWall slug={params.projectSlug} />;
}



