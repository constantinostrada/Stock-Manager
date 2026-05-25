/**
 * Database Seed Script
 *
 * Populates the database with sample data for development.
 * Run with: npm run db:seed
 *
 * LAYER: infrastructure
 */

import { prisma } from "./prismaClient";

async function main(): Promise<void> {
  console.log("🌱 Seeding database...");

  // ─── Categories ─────────────────────────────────────────────────────────
  const electronics = await prisma.category.upsert({
    where: { name: "Electronics" },
    update: {},
    create: {
      id: "cat-electronics",
      name: "Electronics",
    },
  });

  const office = await prisma.category.upsert({
    where: { name: "Office Supplies" },
    update: {},
    create: {
      id: "cat-office",
      name: "Office Supplies",
    },
  });

  const furniture = await prisma.category.upsert({
    where: { name: "Furniture" },
    update: {},
    create: {
      id: "cat-furniture",
      name: "Furniture",
    },
  });

  console.log(`  ✔ Created categories: ${[electronics.name, office.name, furniture.name].join(", ")}`);

  // ─── Products ────────────────────────────────────────────────────────────
  const laptop = await prisma.product.upsert({
    where: { sku: "ELEC-LPT01" },
    update: {},
    create: {
      id: "prod-laptop",
      name: "Business Laptop 15\"",
      description: "High-performance business laptop with 16GB RAM and 512GB SSD.",
      sku: "ELEC-LPT01",
      price: 1299.99,
      categoryId: electronics.id,
    },
  });

  const keyboard = await prisma.product.upsert({
    where: { sku: "ELEC-KB01" },
    update: {},
    create: {
      id: "prod-keyboard",
      name: "Mechanical Keyboard",
      description: "Tenkeyless mechanical keyboard with Cherry MX switches.",
      sku: "ELEC-KB01",
      price: 129.99,
      categoryId: electronics.id,
    },
  });

  const monitor = await prisma.product.upsert({
    where: { sku: "ELEC-MON01" },
    update: {},
    create: {
      id: "prod-monitor",
      name: "4K Monitor 27\"",
      description: "Ultra HD IPS display with USB-C connectivity.",
      sku: "ELEC-MON01",
      price: 649.99,
      categoryId: electronics.id,
    },
  });

  const paper = await prisma.product.upsert({
    where: { sku: "OFF-PPR01" },
    update: {},
    create: {
      id: "prod-paper",
      name: "A4 Copy Paper (500 sheets)",
      description: "80gsm premium copy paper, ream of 500 sheets.",
      sku: "OFF-PPR01",
      price: 8.99,
      categoryId: office.id,
    },
  });

  const desk = await prisma.product.upsert({
    where: { sku: "FRN-DSK01" },
    update: {},
    create: {
      id: "prod-desk",
      name: "Standing Desk",
      description: "Electric height-adjustable standing desk, 140x70cm.",
      sku: "FRN-DSK01",
      price: 799.99,
      categoryId: furniture.id,
    },
  });

  console.log(`  ✔ Created products: ${[laptop.name, keyboard.name, monitor.name, paper.name, desk.name].map((n) => n).join(", ")}`);

  // ─── Stock Levels ─────────────────────────────────────────────────────────
  const stockData = [
    { productId: laptop.id, quantity: 12, minQuantity: 5 },
    { productId: keyboard.id, quantity: 3, minQuantity: 5 },    // Low stock
    { productId: monitor.id, quantity: 0, minQuantity: 3 },     // Out of stock
    { productId: paper.id, quantity: 250, minQuantity: 50 },
    { productId: desk.id, quantity: 7, minQuantity: 2 },
  ];

  for (const data of stockData) {
    await prisma.stockLevel.upsert({
      where: { productId: data.productId },
      update: {},
      create: {
        id: `stock-${data.productId}`,
        productId: data.productId,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
      },
    });
  }

  console.log("  ✔ Created stock levels");

  // ─── Stock Movements ──────────────────────────────────────────────────────
  const movements = [
    { productId: laptop.id, type: "IN", quantity: 20, reason: "Initial stock receipt", reference: "PO-001" },
    { productId: laptop.id, type: "OUT", quantity: 8, reason: "Sales", reference: "SO-001" },
    { productId: keyboard.id, type: "IN", quantity: 10, reason: "Initial stock receipt", reference: "PO-002" },
    { productId: keyboard.id, type: "OUT", quantity: 7, reason: "Sales", reference: "SO-002" },
    { productId: monitor.id, type: "IN", quantity: 5, reason: "Initial stock receipt", reference: "PO-003" },
    { productId: monitor.id, type: "OUT", quantity: 5, reason: "Sales", reference: "SO-003" },
    { productId: paper.id, type: "IN", quantity: 500, reason: "Bulk purchase", reference: "PO-004" },
    { productId: paper.id, type: "OUT", quantity: 250, reason: "Office usage" },
    { productId: desk.id, type: "IN", quantity: 7, reason: "Initial stock receipt", reference: "PO-005" },
  ];

  for (let i = 0; i < movements.length; i++) {
    const m = movements[i]!;
    await prisma.stockMovement.create({
      data: {
        id: `mov-${i + 1}`,
        productId: m.productId,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason ?? null,
        reference: m.reference ?? null,
      },
    });
  }

  console.log("  ✔ Created stock movements");
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(() => {});
  });
