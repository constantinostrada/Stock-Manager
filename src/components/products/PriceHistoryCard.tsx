/**
 * PriceHistoryCard
 *
 * T4 — "Historial de precios" card for the product detail page.
 * Pure presentational component: receives PriceChangeDTOs (oldest first) and
 * renders an inline SVG sparkline (no chart library) plus the change list
 * (most recent first) with % delta colored (increase red, decrease green).
 * Shows a friendly empty state when the product never changed price.
 *
 * LAYER: interfaces (presentation only — history is captured in application)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PriceChangeDTO } from "@application/dtos/PriceHistoryDTO";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

const MONEY_FORMATTER = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PERCENT_FORMATTER = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface PriceHistoryCardProps {
  /** Price changes ordered oldest first (as returned by the use case). */
  entries: PriceChangeDTO[];
  /** ISO 4217 currency code of the product (e.g. "USD"). */
  currency: string;
}

const SPARK_WIDTH = 240;
const SPARK_HEIGHT = 48;
const SPARK_PADDING = 4;

/**
 * Builds the polyline points for the price-over-time series:
 * the first entry's oldPrice followed by every newPrice.
 */
function buildSparklinePoints(prices: number[]): string {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const innerWidth = SPARK_WIDTH - SPARK_PADDING * 2;
  const innerHeight = SPARK_HEIGHT - SPARK_PADDING * 2;

  return prices
    .map((price, i) => {
      const x =
        prices.length === 1
          ? SPARK_WIDTH / 2
          : SPARK_PADDING + (i * innerWidth) / (prices.length - 1);
      const y =
        range === 0
          ? SPARK_HEIGHT / 2
          : SPARK_PADDING + (1 - (price - min) / range) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function PriceHistoryCard({ entries, currency }: PriceHistoryCardProps) {
  const prices =
    entries.length > 0
      ? [entries[0]!.oldPrice, ...entries.map((e) => e.newPrice)]
      : [];
  // List shows the most recent change first.
  const newestFirst = entries.slice().reverse();

  return (
    <Card data-testid="price-history-card">
      <CardHeader>
        <CardTitle>Historial de precios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <div
            className="text-muted-foreground rounded-lg border border-dashed p-8 text-center"
            data-testid="price-history-empty-state"
          >
            <p className="font-medium">Sin cambios de precio registrados aún</p>
            <p className="mt-1 text-sm">
              Cuando edites el precio del producto, el cambio va a aparecer acá.
            </p>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
              className="text-primary h-12 w-full max-w-60"
              role="img"
              aria-label="Evolución del precio en el tiempo"
              data-testid="price-sparkline"
            >
              <polyline
                points={buildSparklinePoints(prices)}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <ul className="divide-y text-sm" data-testid="price-history-list">
              {newestFirst.map((entry) => {
                const isIncrease = entry.newPrice > entry.oldPrice;
                return (
                  <li
                    key={entry.id}
                    className="flex items-baseline justify-between gap-4 py-2"
                    data-testid="price-change-row"
                    data-direction={isIncrease ? "increase" : "decrease"}
                  >
                    <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {DATE_FORMATTER.format(new Date(entry.changedAt))}
                    </span>
                    <span className="font-mono tabular-nums">
                      {currency} {MONEY_FORMATTER.format(entry.oldPrice)}
                      {" → "}
                      {currency} {MONEY_FORMATTER.format(entry.newPrice)}
                    </span>
                    <span
                      className={`font-medium tabular-nums ${
                        isIncrease ? "text-red-600" : "text-emerald-600"
                      }`}
                      data-testid="price-change-delta"
                    >
                      {entry.deltaPercent === null
                        ? "—"
                        : `${entry.deltaPercent > 0 ? "+" : ""}${PERCENT_FORMATTER.format(entry.deltaPercent)}%`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
