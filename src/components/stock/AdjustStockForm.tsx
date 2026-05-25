"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { adjustStock } from "@interfaces/actions/stockActions";
import type { ProductDTO } from "@application/dtos/ProductDTO";

interface AdjustStockFormProps {
  products: ProductDTO[];
  defaultProductId?: string;
}

export function AdjustStockForm({ products, defaultProductId }: AdjustStockFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("IN");

  async function handleSubmit(formData: FormData) {
    setFormError(null);

    const rawData = {
      productId: formData.get("productId") as string,
      type: formData.get("type") as "IN" | "OUT" | "ADJUSTMENT",
      quantity: parseInt(formData.get("quantity") as string, 10),
      reason: (formData.get("reason") as string) || undefined,
      reference: (formData.get("reference") as string) || undefined,
    };

    startTransition(async () => {
      const result = await adjustStock(rawData);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast({
        title: "Stock adjusted",
        description: `${result.data.productName} — new quantity: ${result.data.quantity}`,
      });
      router.push("/stock");
      router.refresh();
    });
  }

  const typeDescriptions: Record<string, string> = {
    IN: "Increase stock — use when receiving goods (purchase orders, returns).",
    OUT: "Decrease stock — use when shipping goods (sales, wastage).",
    ADJUSTMENT: "Set stock to an exact quantity — use for physical stock counts.",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-5">
          {formError && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="productId">Product *</Label>
            <Select name="productId" defaultValue={defaultProductId ?? ""}>
              <SelectTrigger id="productId">
                <SelectValue placeholder="Select a product…" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Movement Type *</Label>
            <Select
              name="type"
              defaultValue="IN"
              onValueChange={setSelectedType}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">Stock In (Receive)</SelectItem>
                <SelectItem value="OUT">Stock Out (Ship)</SelectItem>
                <SelectItem value="ADJUSTMENT">Adjustment (Set exact)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{typeDescriptions[selectedType]}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quantity">
              {selectedType === "ADJUSTMENT" ? "New Quantity *" : "Quantity *"}
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              step={1}
              placeholder="0"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="e.g. Purchase order receipt, customer return…"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference / Order Number</Label>
            <Input
              id="reference"
              name="reference"
              placeholder="e.g. PO-001, SO-123"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Recording…" : "Record Movement"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
