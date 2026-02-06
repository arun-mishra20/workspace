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
import { listExpenses } from "@/features/expenses/api/list-expenses";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/ui/tabs";
import { Dot, MailSearch, RefreshCcw, Unplug } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { appPaths } from "@/config/app-paths";
import type { Transaction } from "@workspace/domain";

type ExpenseView = "expense" | "emails";

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

const formatAmount = (transaction: Transaction) => {
  const signedAmount =
    transaction.transactionType === "debited"
      ? -Math.abs(transaction.amount)
      : Math.abs(transaction.amount);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: transaction.currency,
    }).format(signedAmount);
  } catch {
    const sign = signedAmount < 0 ? "-" : "";
    return `${sign}${transaction.currency} ${Math.abs(signedAmount).toFixed(2)}`;
  }
};

const emailColumns: ColumnDef<RawEmail>[] = [
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

const expenseColumns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "transactionDate",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.transactionDate),
  },
  {
    accessorKey: "merchant",
    header: "Merchant",
    cell: ({ row }) => (
      <div className="font-medium text-foreground">{row.original.merchant}</div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <div
        className={
          row.original.transactionType === "debited"
            ? "font-medium text-red-600"
            : "font-medium text-emerald-600"
        }
      >
        {formatAmount(row.original)}
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.original.category.replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "transactionMode",
    header: "Mode",
    cell: ({ row }) => (
      <span className="capitalize">
        {row.original.transactionMode.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    accessorKey: "requiresReview",
    header: "Review",
    cell: ({ row }) =>
      row.original.requiresReview ? (
        <Badge variant="outline">Required</Badge>
      ) : (
        <Badge variant="secondary">Done</Badge>
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
  }, [value, mv]);

  return <motion.span>{rounded}</motion.span>;
}

const ExpenseEmailsPage = () => {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<ExpenseView>("expense");
  const [emailPageIndex, setEmailPageIndex] = useState(0);
  const [expensePageIndex, setExpensePageIndex] = useState(0);
  const pageSize = 20;
  const navigate = useNavigate();

  const {
    data: emailData,
    isLoading: isEmailsLoading,
    isError: isEmailsError,
  } = useQuery({
    queryKey: ["expenses", "emails", emailPageIndex + 1],
    queryFn: () =>
      listExpenseEmails({ page: emailPageIndex + 1, page_size: pageSize }),
    enabled: activeView === "emails",
  });

  const {
    data: expensesData,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
  } = useQuery({
    queryKey: ["expenses", "transactions", expensePageIndex + 1],
    queryFn: () =>
      listExpenses({ page: expensePageIndex + 1, page_size: pageSize }),
    enabled: activeView === "expense",
  });

  const emailTable = useReactTable({
    data: emailData?.data ?? [],
    columns: emailColumns,
    pageCount: emailData ? Math.ceil(emailData.total / emailData.page_size) : 0,
    state: {
      pagination: {
        pageIndex: emailPageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({ pageIndex: emailPageIndex, pageSize });
        setEmailPageIndex(newState.pageIndex);
      } else {
        setEmailPageIndex(updater.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const expenseTable = useReactTable({
    data: expensesData?.data ?? [],
    columns: expenseColumns,
    pageCount: expensesData
      ? Math.ceil(expensesData.total / expensesData.page_size)
      : 0,
    state: {
      pagination: {
        pageIndex: expensePageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({ pageIndex: expensePageIndex, pageSize });
        setExpensePageIndex(newState.pageIndex);
      } else {
        setExpensePageIndex(updater.pageIndex);
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
            <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              View derived expense transactions and source emails.
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

        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as ExpenseView)}
        >
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {activeView === "expense" ? "All Expenses" : "Recent Emails"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <TabsList className="mr-2">
                  <TabsTrigger value="expense">Expense</TabsTrigger>
                  <TabsTrigger value="emails">Emails</TabsTrigger>
                </TabsList>
                <Badge variant="outline">
                  {activeView === "expense"
                    ? expensesData?.total ?? 0
                    : emailData?.total ?? 0}{" "}
                  total
                </Badge>
                <Badge variant="secondary">
                  Page{" "}
                  {activeView === "expense"
                    ? expensePageIndex + 1
                    : emailPageIndex + 1}{" "}
                  of{" "}
                  {activeView === "expense"
                    ? expenseTable.getPageCount() || 1
                    : emailTable.getPageCount() || 1}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="expense" className="mt-0">
                {isExpensesLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading expenses…
                  </p>
                ) : null}
                {isExpensesError ? (
                  <p className="text-sm text-destructive">
                    We couldn’t load expenses. Please try again in a moment.
                  </p>
                ) : null}
                {!isExpensesLoading &&
                !isExpensesError &&
                expenseTable.getRowModel().rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No expenses found yet.
                  </p>
                ) : null}
                {!isExpensesLoading &&
                !isExpensesError &&
                expenseTable.getRowModel().rows.length > 0 ? (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        {expenseTable.getHeaderGroups().map((headerGroup) => (
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
                        {expenseTable.getRowModel().rows.map((row) => (
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

                    {expenseTable.getPageCount() > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {expensePageIndex * pageSize + 1} to{" "}
                          {Math.min(
                            (expensePageIndex + 1) * pageSize,
                            expensesData?.total ?? 0,
                          )}{" "}
                          of {expensesData?.total ?? 0} expenses
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => expenseTable.previousPage()}
                            disabled={!expenseTable.getCanPreviousPage()}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => expenseTable.nextPage()}
                            disabled={!expenseTable.getCanNextPage()}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="emails" className="mt-0">
                {isEmailsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading expense emails…
                  </p>
                ) : null}
                {isEmailsError ? (
                  <p className="text-sm text-destructive">
                    We couldn’t load emails. Please try again in a moment.
                  </p>
                ) : null}
                {!isEmailsLoading &&
                !isEmailsError &&
                emailTable.getRowModel().rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No expense emails found yet.
                  </p>
                ) : null}
                {!isEmailsLoading &&
                !isEmailsError &&
                emailTable.getRowModel().rows.length > 0 ? (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        {emailTable.getHeaderGroups().map((headerGroup) => (
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
                        {emailTable.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            className="cursor-pointer hover:bg-muted/40"
                            role="link"
                            tabIndex={0}
                            onClick={() => {
                              const email = row.original;
                              navigate(
                                appPaths.auth.expensesEmailDetails.getHref(
                                  email.id,
                                ),
                              );
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter" && event.key !== " ") {
                                return;
                              }
                              event.preventDefault();
                              const email = row.original;
                              navigate(
                                appPaths.auth.expensesEmailDetails.getHref(
                                  email.id,
                                ),
                              );
                            }}
                          >
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

                    {emailTable.getPageCount() > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {emailPageIndex * pageSize + 1} to{" "}
                          {Math.min(
                            (emailPageIndex + 1) * pageSize,
                            emailData?.total ?? 0,
                          )}{" "}
                          of {emailData?.total ?? 0} emails
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => emailTable.previousPage()}
                            disabled={!emailTable.getCanPreviousPage()}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => emailTable.nextPage()}
                            disabled={!emailTable.getCanNextPage()}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ExpenseEmailsPage;
