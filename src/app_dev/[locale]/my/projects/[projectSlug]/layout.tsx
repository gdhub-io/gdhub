"use client";

import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";

export default function ProjectLayout({ children }: { children: any }) {
  return <ProtectedProjectLayout>{children}</ProtectedProjectLayout>;
}


