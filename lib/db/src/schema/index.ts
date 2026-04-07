import { pgTable, serial, text, integer, boolean, timestamp, varchar, jsonb, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  cardNumber: integer("card_number").notNull().default(0),
  createdByRole: varchar("created_by_role", { length: 20 }).notNull().default("visitor"),
  ownerType: varchar("owner_type", { length: 20 }),
  propertyType: varchar("property_type", { length: 30 }),
  region: text("region").notNull(),
  projectName: text("project_name"),
  price: text("price"),
  floor: text("floor"),
  area: text("area"),
  description: text("description"),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  mapsLink: text("maps_link"),
  images: jsonb("images").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  archived: boolean("archived").default(false),
  isFeatured: boolean("is_featured").default(false),
  commitment: boolean("commitment").default(false),
  createdByName: text("created_by_name"),
  createdByPhone: text("created_by_phone"),
  visitorId: text("visitor_id"),
  packageType: varchar("package_type", { length: 20 }),
  packageAmount: integer("package_amount"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_listings_status").on(t.status),
  index("idx_listings_created_at").on(t.createdAt),
  index("idx_listings_created_by_phone").on(t.createdByPhone),
  index("idx_listings_is_featured").on(t.isFeatured),
  index("idx_listings_archived").on(t.archived),
  index("idx_listings_status_created_at").on(t.status, t.createdAt),
]);

export const floorsTable = pgTable("floors", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listingsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  area: text("area"),
  price: text("price"),
  order: integer("order").default(0),
}, (t) => [
  index("idx_floors_listing_id").on(t.listingId),
]);

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  walletPaid: numeric("wallet_paid", { precision: 10, scale: 3 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminConfigTable = pgTable("admin_config", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().default("1"),
  password: text("password").notNull().default("111"),
  name: text("name").notNull().default("المدير"),
});

export const paidAdsTable = pgTable("paid_ads", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listingsTable.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  phone: text("phone"),
  packageType: varchar("package_type", { length: 20 }).notNull(),
  amount: integer("amount").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  contactCount: integer("contact_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_paid_ads_listing_id").on(t.listingId),
  index("idx_paid_ads_status").on(t.status),
  index("idx_paid_ads_end_date").on(t.endDate),
]);

export const appStatsTable = pgTable("app_stats", {
  id: serial("id").primaryKey(),
  visitorCount: integer("visitor_count").default(0),
  companyVisitorCount: integer("company_visitor_count").default(0),
  cardCounter: integer("card_counter").default(0),
  visitorPhones: jsonb("visitor_phones").$type<string[]>().default([]),
  visitorData: jsonb("visitor_data").$type<{ name: string; phone: string }[]>().default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeePaymentsTable = pgTable("employee_payments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employeesTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 3 }).notNull(),
  paidAt: timestamp("paid_at").defaultNow(),
}, (t) => [
  index("idx_employee_payments_employee_id").on(t.employeeId),
  index("idx_employee_payments_paid_at").on(t.paidAt),
]);

export const contactLogsTable = pgTable("contact_logs", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").references(() => listingsTable.id, { onDelete: "cascade" }),
  visitorName: text("visitor_name"),
  visitorPhone: text("visitor_phone"),
  companyName: text("company_name"),
  companyPhone: text("company_phone"),
  contactType: varchar("contact_type", { length: 20 }).notNull(), // 'whatsapp' | 'call'
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("idx_contact_logs_listing_id").on(t.listingId),
  index("idx_contact_logs_visitor_phone").on(t.visitorPhone),
  index("idx_contact_logs_company_phone").on(t.companyPhone),
  index("idx_contact_logs_created_at").on(t.createdAt),
]);

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true });
export const insertFloorSchema = createInsertSchema(floorsTable).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });

export type Listing = typeof listingsTable.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Floor = typeof floorsTable.$inferSelect;
export type Employee = typeof employeesTable.$inferSelect;
