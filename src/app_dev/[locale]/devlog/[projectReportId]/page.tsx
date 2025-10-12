import axios from "axios";
import DevlogReportClient, { type DevlogPost } from "./Client";

export const revalidate = 300;

async function fetchPost(id: string, cookie?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await axios.get(`${baseUrl}/api/devlog/${id}`, { headers: cookie ? { cookie } : undefined });
  return res.data as DevlogPost;
}

export default async function DevlogReportPage({ params }: { params: { projectReportId: string } }) {
  const post = await fetchPost(params.projectReportId);
  if (!post) return null;
  const contentLength = post.content?.length || 0;
  const isAuthenticated = false;
  return <DevlogReportClient post={post} contentLength={contentLength} isAuthenticated={isAuthenticated} />;
}


