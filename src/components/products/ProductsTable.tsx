"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DeleteProductButton } from "@/components/products/DeleteProductButton";
import { EditProductDialog } from "@/components/products/EditProductDialog";
import { RegisterMovementDialog } from "@/components/stock/RegisterMovementDialog";
import type { ProductDTO } from "@application/dtos/ProductDTO";

interface ProductsTableProps {
  products: ProductDTO[];
  /** Map of productId → current stock quantity, used to render the Stock column. */
  stockByProductId?: Record<string, number>;
  /** Map of productId → count of stock movements, used by DeleteProductButton's confirmation message. */
  movementCountByProductId?: Record<string, number>;
  /** Category options for the inline EditProductDialog. */
  categories?: Array<{ id: string; name: string }>;
}

export function ProductsTable({
  products,
  stockByProductId = {},
  movementCountByProductId = {},
  categories = [],
}: ProductsTableProps) {
  const router = useRouter();

  if (products.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">Add your first product to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Product</th>
            <th className="px-4 py-3 text-left font-medium">SKU</th>
            <th className="px-4 py-3 text-left font-medium">Category</th>
            <th className="px-4 py-3 text-right font-medium">Stock</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map((product) => {
            const href = `/products/${encodeURIComponent(product.sku)}`;
            return (
              <tr
                key={product.id}
                data-testid="product-row"
                data-product-id={product.id}
                data-product-sku={product.sku}
                role="link"
                tabIndex={0}
                onClick={() => router.push(href)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(href);
                  }
                }}
                className="hover:bg-muted/30 cursor-pointer transition-colors focus:bg-muted/40 focus:outline-none"
              >
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                        {product.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                    {product.sku}
                  </code>
                </td>
                <td className="px-4 py-3">
                  {product.categoryName ? (
                    <Badge variant="secondary">{product.categoryName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td
                  className="px-4 py-3 text-right font-mono tabular-nums"
                  data-testid="stock-cell"
                >
                  {stockByProductId[product.id] ?? 0}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {product.currency} {product.price.toFixed(2)}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  data-testid="row-actions-cell"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1">
                    <RegisterMovementDialog
                      productId={product.id}
                      productName={product.name}
                      productSku={product.sku}
                      tipo="ENTRADA"
                    />
                    <RegisterMovementDialog
                      productId={product.id}
                      productName={product.name}
                      productSku={product.sku}
                      tipo="SALIDA"
                    />
                    <EditProductDialog
                      product={product}
                      currentStock={stockByProductId[product.id] ?? 0}
                      categories={categories}
                    />
                    <DeleteProductButton
                      productId={product.id}
                      productName={product.name}
                      productSku={product.sku}
                      movementCount={movementCountByProductId[product.id] ?? 0}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
