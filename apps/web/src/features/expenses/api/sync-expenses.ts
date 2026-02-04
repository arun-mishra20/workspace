import {
  StartSyncJobResponseSchema,
  SyncJobSchema,
  type StartSyncJobResponse,
  type SyncJob,
} from "@workspace/domain";

import { apiRequest } from "@/lib/api-request";

/**
 * Start a new sync job (async)
 * Returns immediately with a job ID for polling
 */
export async function startSyncJob(): Promise<StartSyncJobResponse> {
  const response = await apiRequest("/api/expenses/sync", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to start sync job");
  }

  const json = await response.json();
  return StartSyncJobResponseSchema.parse(json);
}

/**
 * Get the status of a sync job
 */
export async function getSyncJobStatus(jobId: string): Promise<SyncJob> {
  const response = await apiRequest(`/api/expenses/sync/${jobId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch sync job status");
  }

  const json = await response.json();
  return SyncJobSchema.parse(json);
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use startSyncJob instead
 */
export async function syncExpenses(): Promise<StartSyncJobResponse> {
  return startSyncJob();
}
