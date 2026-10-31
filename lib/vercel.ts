import "server-only";

type VercelDeploymentResponse = {
  deployments?: Array<{
    uid?: string;
    url?: string;
    state?: string;
    created?: number;
    ready?: number;
  }>;
};

export type DeploymentStatus = {
  id: string;
  url: string;
  state: "ready" | "building" | "queued" | "error" | "canceled" | "unknown";
  createdAt?: string;
  readyAt?: string;
};

const token = process.env.VERCEL_ACCESS_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID;

export function isDeploymentTrackingConfigured(): boolean {
  return Boolean(token && projectId);
}

function normalizeState(state?: string): DeploymentStatus["state"] {
  switch (state) {
    case "READY":
      return "ready";
    case "BUILDING":
    case "INITIALIZING":
      return "building";
    case "QUEUED":
      return "queued";
    case "ERROR":
      return "error";
    case "CANCELED":
      return "canceled";
    default:
      return "unknown";
  }
}

export async function getLatestProductionDeployment(): Promise<DeploymentStatus | null> {
  if (!token || !projectId) return null;

  const query = new URLSearchParams({ projectId, limit: "1", target: "production" });
  if (teamId) query.set("teamId", teamId);

  const response = await fetch(`https://api.vercel.com/v6/deployments?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Vercel deployment lookup failed with ${response.status}.`);

  const data = (await response.json()) as VercelDeploymentResponse;
  const deployment = data.deployments?.[0];
  if (!deployment?.uid || !deployment.url) return null;

  return {
    id: deployment.uid,
    url: `https://${deployment.url}`,
    state: normalizeState(deployment.state),
    createdAt: deployment.created ? new Date(deployment.created).toISOString() : undefined,
    readyAt: deployment.ready ? new Date(deployment.ready).toISOString() : undefined,
  };
}
