import {
  StartSyncJobResponseSchema,
  SyncJobSchema,
  type StartSyncJobResponse,
  type SyncJob,
} from "@workspace/domain";

import { apiRequest } from "@/lib/api-client";

/**
 * Start a new sync job (async)
 * Returns immediately with a job ID for polling
 */
export async function startSyncJob(): Promise<StartSyncJobResponse> {
  const json = await apiRequest({
    method: "POST",
    url: "/api/expenses/sync",
    headers: {
      Accept: "application/json",
    },
    toastSuccess: true,
    successMessage: "Sync started",
  });

  return StartSyncJobResponseSchema.parse(json);
}

/**
 * Get the status of a sync job
 * Note: toastError is disabled since this is called frequently in polling loops
 */
export async function getSyncJobStatus(
  jobId: string,
  signal?: AbortSignal,
): Promise<SyncJob> {
  const json = await apiRequest({
    method: "GET",
    url: `/api/expenses/sync/${jobId}`,
    headers: {
      Accept: "application/json",
    },
    signal,
    toastError: false, // Disable toast for polling requests
  });

  return SyncJobSchema.parse(json);
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use startSyncJob instead
 */
export async function syncExpenses(): Promise<StartSyncJobResponse> {
  return startSyncJob();
}

/**
 * Start a reprocess job — re-parse all stored emails without fetching from Gmail.
 * Returns immediately with a job ID for polling (same as sync jobs).
 */
export async function startReprocessJob(): Promise<StartSyncJobResponse> {
  const json = await apiRequest({
    method: "POST",
    url: "/api/expenses/reprocess",
    headers: {
      Accept: "application/json",
    },
    toastSuccess: true,
    successMessage: "Reprocessing started",
  });

  return StartSyncJobResponseSchema.parse(json);
}
