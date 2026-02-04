import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MainLayout } from "@/components/layouts";
import { connectGmail } from "@/features/expenses/api/connect-gmail";
import { disconnectGmail } from "@/features/expenses/api/disconnect-gmail";
import { fetchGmailStatus } from "@/features/expenses/api/gmail-status";
import { listExpenseEmails } from "@/features/expenses/api/list-expense-emails";
import { useSyncJob } from "@/features/expenses/hooks/use-sync-job";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Progress } from "@workspace/ui/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";

const ExpenseEmailsPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["expenses", "emails"],
    queryFn: () => listExpenseEmails({ limit: 50, offset: 0 }),
  });
  const statusQuery = useQuery({
    queryKey: ["expenses", "gmail-status"],
    queryFn: fetchGmailStatus,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const connectMutation = useMutation({
    mutationFn: connectGmail,
    onSuccess: (data) => {
      window.location.assign(data.url);
    },
  });
  const {
    startSync,
    job,
    isSyncing,
    progress,
    error: syncError,
  } = useSyncJob();
  const disconnectMutation = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: () => {
      queryClient.setQueryData(["expenses", "gmail-status"], {
        connected: false,
        email: null,
      });
      queryClient
        .invalidateQueries({ queryKey: ["expenses", "gmail-status"] })
        .then(() => {
          statusQuery.refetch();
        });
    },
  });

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Expenses
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Expense Emails
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Latest expense-related emails captured from connected inboxes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="default"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {statusQuery.data?.connected
                ? "Reconnect Gmail"
                : "Connect Gmail"}
            </Button>
            <Button
              variant="outline"
              onClick={() => disconnectMutation.mutate()}
              disabled={
                !statusQuery.data?.connected || disconnectMutation.isPending
              }
            >
              Disconnect Gmail
            </Button>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={startSync}
                disabled={!statusQuery.data?.connected || isSyncing}
              >
                {isSyncing ? "Syncing…" : "Sync Inbox"}
              </Button>
              {isSyncing && (
                <div className="flex flex-col gap-1 min-w-[200px]">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {job?.status === "pending" && "Starting sync..."}
                    {job?.status === "processing" && job.totalEmails
                      ? `Processing ${job.processedEmails} of ${job.totalEmails} emails`
                      : job?.status === "processing"
                        ? "Fetching emails..."
                        : null}
                    {job?.newEmails ? ` • ${job.newEmails} new` : ""}
                  </p>
                </div>
              )}
              {!isSyncing && job?.status === "completed" && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ Synced {job.newEmails} new emails, {job.transactions}{" "}
                  transactions
                </p>
              )}
              {syncError && (
                <p className="text-xs text-destructive">{syncError.message}</p>
              )}
            </div>
            {statusQuery.data?.connected ? (
              <Badge variant="secondary">
                Connected
                {statusQuery.data.email ? ` • ${statusQuery.data.email}` : ""}
              </Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
        </header>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Recent Emails
            </CardTitle>
            <Badge variant="outline">{rows.length} items</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading expense emails…
              </p>
            ) : null}
            {isError ? (
              <p className="text-sm text-destructive">
                We couldn’t load emails. Please try again in a moment.
              </p>
            ) : null}
            {!isLoading && !isError && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expense emails found yet.
              </p>
            ) : null}
            {!isLoading && !isError && rows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Provider</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium text-foreground">
                        {email.from || "Unknown sender"}
                      </TableCell>
                      <TableCell>{email.subject || "(no subject)"}</TableCell>
                      <TableCell>{formatDate(email.receivedAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {email.provider}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default ExpenseEmailsPage;
