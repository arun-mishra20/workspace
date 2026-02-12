import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/ui/dialog";
import { Button } from "@workspace/ui/components/ui/button";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { useImportFromGroww } from "@/features/holdings/api/holdings";
import { toast } from "sonner";

interface ImportGrowwDialogProps {
  trigger?: React.ReactNode;
}

export function ImportGrowwDialog({ trigger }: ImportGrowwDialogProps) {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const importMutation = useImportFromGroww();

  const handleImport = () => {
    if (!jsonInput.trim()) return;

    importMutation.mutate(jsonInput, {
      onSuccess: (data) => {
        toast.success(`Imported ${data.imported} holdings`, {
          description: data.skipped
            ? `${data.skipped} items skipped`
            : undefined,
        });
        setJsonInput("");
        setOpen(false);
      },
      onError: (error: any) => {
        toast.error("Import failed", {
          description:
            error.response?.data?.message?.[0] ||
            error.response?.data?.message ||
            error.message,
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import from Groww
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Groww</DialogTitle>
          <DialogDescription>
            Paste the JSON data exported from Groww. This will replace existing
            Groww holdings while keeping any manually added entries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            placeholder={`{
  "result_timestamp": "...",
  "result": {
    "EQUITY": { "holdings": [...] },
    "MUTUAL_FUNDS": { "portfolio_details": { "holdings": [...] } }
  }
}`}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Supports equity stocks and mutual fund holdings from Groww exports.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!jsonInput.trim() || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
