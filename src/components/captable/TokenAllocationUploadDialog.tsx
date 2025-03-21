import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Download, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TokenAllocationUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (allocations: any[]) => void;
  projectId: string;
}

const TokenAllocationUploadDialog = ({
  open,
  onOpenChange,
  onUploadComplete,
  projectId,
}: TokenAllocationUploadDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationErrors([]);
    setParsedData([]);

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv")
      ) {
        setFile(selectedFile);
        validateCsvFile(selectedFile);
      } else {
        setValidationErrors(["Please upload a CSV file."]);
      }
    }
  };

  // Validate CSV file
  const validateCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");

        if (lines.length <= 1) {
          setValidationErrors(["The CSV file appears to be empty or invalid."]);
          return;
        }

        // Parse headers
        const headers = hasHeaders
          ? lines[0].split(",").map((h) => h.trim())
          : [
              "subscription_id",
              "investor_name",
              "investor_email",
              "token_type",
              "token_amount",
              "wallet_address",
            ];

        // Validate required headers
        const requiredHeaders = [
          "subscription_id",
          "token_type",
          "token_amount",
        ];
        const missingHeaders = requiredHeaders.filter(
          (h) =>
            !headers.some((header) => header.toLowerCase() === h.toLowerCase()),
        );

        if (missingHeaders.length > 0) {
          setValidationErrors([
            `Missing required headers: ${missingHeaders.join(", ")}`,
          ]);
          return;
        }

        // Parse data rows
        const startRow = hasHeaders ? 1 : 0;
        const data = [];
        const errors = [];

        for (let i = startRow; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].split(",").map((v) => v.trim());
          const row: Record<string, string> = {};

          // Check if row has correct number of columns
          if (values.length !== headers.length) {
            errors.push(
              `Row ${i + 1} has ${values.length} columns, expected ${headers.length}`,
            );
            continue;
          }

          headers.forEach((header, index) => {
            row[header.toLowerCase()] = values[index] || "";
          });

          // Validate required fields
          if (!row.subscription_id) {
            errors.push(`Row ${i + 1}: Missing subscription ID`);
          }

          if (!row.token_type) {
            errors.push(`Row ${i + 1}: Missing token type`);
          }

          if (!row.token_amount) {
            errors.push(`Row ${i + 1}: Missing token amount`);
          } else if (isNaN(parseFloat(row.token_amount))) {
            errors.push(
              `Row ${i + 1}: Invalid token amount '${row.token_amount}'`,
            );
          }

          data.push(row);
        }

        if (errors.length > 0) {
          setValidationErrors(errors);
          return;
        }

        setParsedData(data);
      } catch (error) {
        console.error("Error parsing CSV:", error);
        setValidationErrors([
          "Failed to parse CSV file. Please check the format.",
        ]);
      }
    };

    reader.readAsText(file);
  };

  // Handle upload
  const handleUpload = () => {
    if (validationErrors.length > 0 || parsedData.length === 0) return;

    setIsProcessing(true);

    // Process the data
    const processedData = parsedData.map((row) => ({
      subscription_id: row.subscription_id,
      investor_name: row.investor_name || "",
      investor_email: row.investor_email || "",
      token_type: row.token_type,
      token_amount: parseFloat(row.token_amount),
      wallet_address: row.wallet_address || "",
      project_id: projectId,
    }));

    // Simulate processing delay
    setTimeout(() => {
      onUploadComplete(processedData);
      setIsProcessing(false);
      resetForm();
    }, 1000);
  };

  // Download template
  const downloadTemplate = () => {
    const headers =
      "subscription_id,investor_name,investor_email,token_type,token_amount,wallet_address";
    const sampleData = [
      "SUB-12345,John Doe,john@example.com,ERC-20,10000,0x1234567890abcdef1234567890abcdef12345678",
      "SUB-67890,Jane Smith,jane@example.com,ERC-1400,25000,0x2345678901abcdef2345678901abcdef23456789",
    ];
    const csvContent = [headers, ...sampleData].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "token_allocation_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset form
  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <span>Upload Token Allocations</span>
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file containing token allocation information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csvFile">CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="hasHeaders"
                checked={hasHeaders}
                onCheckedChange={(checked) => {
                  setHasHeaders(!!checked);
                  if (file) validateCsvFile(file);
                }}
              />
              <Label htmlFor="hasHeaders" className="text-sm">
                CSV file has header row
              </Label>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Validation Errors:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {parsedData.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Preview ({parsedData.length} allocations)
              </h3>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left">Subscription ID</th>
                      <th className="px-4 py-2 text-left">Investor</th>
                      <th className="px-4 py-2 text-left">Token Type</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-4 py-2">{row.subscription_id}</td>
                        <td className="px-4 py-2">
                          <div>{row.investor_name}</div>
                          {row.investor_email && (
                            <div className="text-xs text-muted-foreground">
                              {row.investor_email}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">{row.token_type}</td>
                        <td className="px-4 py-2 text-right">
                          {parseFloat(row.token_amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {parsedData.length > 5 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-2 text-center text-muted-foreground"
                        >
                          ... and {parsedData.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-muted/20 p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">CSV Format</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Your CSV file should include the following columns:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">
                  subscription_id
                </span>{" "}
                (required): ID of the subscription to allocate tokens for
              </li>
              <li>
                <span className="font-medium text-foreground">
                  investor_name
                </span>
                : Name of the investor (for reference only)
              </li>
              <li>
                <span className="font-medium text-foreground">
                  investor_email
                </span>
                : Email address of the investor (for reference only)
              </li>
              <li>
                <span className="font-medium text-foreground">token_type</span>{" "}
                (required): Type of token to allocate (e.g., ERC-20, ERC-1400)
              </li>
              <li>
                <span className="font-medium text-foreground">
                  token_amount
                </span>{" "}
                (required): Number of tokens to allocate
              </li>
              <li>
                <span className="font-medium text-foreground">
                  wallet_address
                </span>
                : Investor's wallet address for token distribution
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={
              !file ||
              validationErrors.length > 0 ||
              parsedData.length === 0 ||
              isProcessing
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Upload Allocations"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TokenAllocationUploadDialog;
