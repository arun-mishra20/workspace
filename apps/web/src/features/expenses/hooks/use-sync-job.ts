import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  startSyncJob,
  getSyncJobStatus,
} from "@/features/expenses/api/sync-expenses";
import type { SyncJob } from "@workspace/domain";

interface UseSyncJobOptions {
  onComplete?: (job: SyncJob) => void;
  onError?: (error: Error) => void;
  pollingInterval?: number;
}

interface UseSyncJobReturn {
  startSync: () => void;
  job: SyncJob | null;
  isStarting: boolean;
  isPolling: boolean;
  isSyncing: boolean;
  progress: number;
  error: Error | null;
  reset: () => void;
}

export function useSyncJob(options: UseSyncJobOptions = {}): UseSyncJobReturn {
  const { onComplete, onError, pollingInterval = 1000 } = options;
  const queryClient = useQueryClient();

  const [job, setJob] = useState<SyncJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startMutation = useMutation({
    mutationFn: startSyncJob,
    onSuccess: (data) => {
      setJob({
        id: data.jobId,
        userId: "",
        status: "pending",
        query: null,
        totalEmails: null,
        processedEmails: 0,
        newEmails: 0,
        transactions: 0,
        statements: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsPolling(true);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error("Failed to start sync"));
      onError?.(err instanceof Error ? err : new Error("Failed to start sync"));
    },
  });

  // Polling effect
  useEffect(() => {
    if (!isPolling || !job?.id) return;

    const pollStatus = async () => {
      try {
        const updatedJob = await getSyncJobStatus(job.id);
        setJob(updatedJob);

        if (updatedJob.status === "completed") {
          setIsPolling(false);
          queryClient.invalidateQueries({ queryKey: ["expenses", "emails"] });
          onComplete?.(updatedJob);
        } else if (updatedJob.status === "failed") {
          setIsPolling(false);
          const err = new Error(updatedJob.errorMessage ?? "Sync failed");
          setError(err);
          onError?.(err);
        }
      } catch (err) {
        setIsPolling(false);
        const error =
          err instanceof Error ? err : new Error("Failed to poll status");
        setError(error);
        onError?.(error);
      }
    };

    const intervalId = setInterval(pollStatus, pollingInterval);

    // Initial poll
    pollStatus();

    return () => clearInterval(intervalId);
  }, [isPolling, job?.id, pollingInterval, queryClient, onComplete, onError]);

  // Calculate progress percentage
  const progress = (() => {
    if (!job) return 0;
    if (job.status === "completed") return 100;
    if (job.status === "pending") return 0;
    if (!job.totalEmails || job.totalEmails === 0) return 10; // Indeterminate but started
    return Math.min(
      Math.round((job.processedEmails / job.totalEmails) * 100),
      99,
    );
  })();

  const startSync = useCallback(() => {
    setError(null);
    setJob(null);
    startMutation.mutate();
  }, [startMutation]);

  const reset = useCallback(() => {
    setJob(null);
    setIsPolling(false);
    setError(null);
  }, []);

  return {
    startSync,
    job,
    isStarting: startMutation.isPending,
    isPolling,
    isSyncing: startMutation.isPending || isPolling,
    progress,
    error,
    reset,
  };
}
