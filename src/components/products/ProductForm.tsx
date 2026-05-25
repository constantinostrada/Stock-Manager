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
import { createProduct, updateProduct } from "@interfaces/actions/productActions";
import type { ProductDTO } from "@application/dtos/ProductDTO";
import type { CategoryDTO } from "@application/dtos/CategoryDTO";

interface ProductFormProps {
  product?: ProductDTO;
  categories: CategoryDTO[];
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = Boolean(product);

  async function handleSubmit(formData: FormData) {
    setErrors({});

    const rawData = {
      ...(isEdit && { id: product!.id }),
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      sku: formData.get("sku") as string,
      price: parseFloat(formData.get("price") as string),
      currency: (formData.get("currency") as string) || "USD",
      categoryId: (formData.get("categoryId") as string) || undefined,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(rawData)
        : await createProduct(rawData);

      if (!result.success) {
        if (result.code === "VALIDATION_ERROR") {
          setErrors({ _form: result.error });
        } else {
          toast({ variant: "destructive", title: "Error", description: result.error });
        }
        return;
      }

      toast({
        title: isEdit ? "Product updated" : "Product created",
        description: isEdit
          ? `${result.data.name} has been updated.`
          : `${result.data.name} has been added to the system.`,
      });
      router.push(`/products/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-5">
          {errors._form && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {errors._form}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name ?? ""}
              placeholder="e.g. Business Laptop 15&quot;"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              name="sku"
              defaultValue={product?.sku ?? ""}
              placeholder="e.g. ELEC-LPT01"
              disabled={isEdit}
              className={isEdit ? "opacity-60" : ""}
              required
            />
            {isEdit && (
              <p className="text-muted-foreground text-xs">SKU cannot be changed after creation.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product?.price ?? ""}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue={product?.currency ?? "USD"}
                placeholder="USD"
                maxLength={3}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="categoryId">Category</Label>
            <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No category</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
              placeholder="Optional product description…"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save Changes"
                  : "Create Product"}
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
