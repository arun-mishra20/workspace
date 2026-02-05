import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { format } from "date-fns";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/ui/table";
import { Dot, MailSearch, RefreshCcw, Unplug } from "lucide-react";

type RawEmail = {
  id: string;
  userId: string;
  provider: string;
  providerMessageId: string;
  from: string;
  subject: string;
  receivedAt: string;
  bodyText: string;
  bodyHtml?: string;
  rawHeaders: Record<string, string>;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, "MMM d, yyyy 'at' h:mm a");
};

const columns: ColumnDef<RawEmail>[] = [
  {
    accessorKey: "from",
    header: "From",
    cell: ({ row }) => (
      <div className="font-medium text-foreground">
        {row.getValue("from") || "Unknown sender"}
      </div>
    ),
  },
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <div className="max-w-125 truncate">
        {row.getValue("subject") || "(no subject)"}
      </div>
    ),
  },
  {
    accessorKey: "receivedAt",
    header: "Received",
    cell: ({ row }) => formatDate(row.getValue("receivedAt")),
  },
  {
    accessorKey: "provider",
    header: "Provider",
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.getValue("provider")}
      </Badge>
    ),
  },
];

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.4,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}

const ExpenseEmailsPage = () => {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 20;

  const {
    data: apiData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expenses", "emails", pageIndex + 1],
    queryFn: () =>
      listExpenseEmails({ page: pageIndex + 1, page_size: pageSize }),
  });

  const table = useReactTable({
    data: apiData?.data ?? [],
    columns,
    pageCount: apiData ? Math.ceil(apiData.total / apiData.page_size) : 0,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({ pageIndex, pageSize });
        setPageIndex(newState.pageIndex);
      } else {
        setPageIndex(updater.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });
  const statusQuery = useQuery({
    queryKey: ["expenses", "gmail-status"],
    queryFn: fetchGmailStatus,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const connectMutation = useMutation({
    mutationFn: connectGmail,
    onSuccess: (data) => {
      window.location.assign(data.url);
    },
  });
  const { startSync, job, isSyncing } = useSyncJob();
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
          void statusQuery.refetch();
        });
    },
  });

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
              <MailSearch />
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
              <Unplug />
              Disconnect Gmail
            </Button>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={startSync}
                disabled={!statusQuery.data?.connected || isSyncing}
                className="relative overflow-hidden"
              >
                <RefreshCcw />
                {/* progress fill */}
                {isSyncing && (
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-300"
                    style={{
                      width: job?.totalEmails
                        ? `${(job.processedEmails / job.totalEmails) * 100}%`
                        : "5%",
                    }}
                  />
                )}

                <span className="relative z-10">
                  {job?.status === "processing" && job.totalEmails ? (
                    <>
                      Syncing (<AnimatedNumber value={job.processedEmails} /> /{" "}
                      {job.totalEmails})
                    </>
                  ) : job?.status === "completed" ? (
                    "Synced"
                  ) : (
                    "Sync"
                  )}
                </span>
              </Button>
            </div>

            {statusQuery.data?.connected ? (
              <Badge variant="outline" className="flex gap-0 items-center">
                <Dot className="text-teal-500 size-6" />
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
            <div className="flex items-center gap-2">
              <Badge variant="outline">{apiData?.total ?? 0} total</Badge>
              <Badge variant="secondary">
                Page {pageIndex + 1} of {table.getPageCount() || 1}
              </Badge>
            </div>
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
            {!isLoading && !isError && table.getRowModel().rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expense emails found yet.
              </p>
            ) : null}
            {!isLoading && !isError && table.getRowModel().rows.length > 0 ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {table.getPageCount() > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {pageIndex * pageSize + 1} to{" "}
                      {Math.min(
                        (pageIndex + 1) * pageSize,
                        apiData?.total ?? 0,
                      )}{" "}
                      of {apiData?.total ?? 0} emails
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ExpenseEmailsPage;
