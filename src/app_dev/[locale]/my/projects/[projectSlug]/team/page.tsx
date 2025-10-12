"use client";

import { useContext } from "react";
import MyTeam from "@/components/MyTeam";
import UserTeam from "@/components/UserTeam";
import { ProjectContext } from "@/contexts/ProjectContext";

const RenderTeam = () => {
  const contextProject = useContext(ProjectContext);
  return contextProject?.contextProject?.isProjectAuthor && contextProject?.isLoaded ? (
    <MyTeam />
  ) : (
    <UserTeam />
  );
};

export default function MyProjectTeamPage() {
  return <RenderTeam />;
}



