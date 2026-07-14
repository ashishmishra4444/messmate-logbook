import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];
export type ExpenseUpdate = Database["public"]["Tables"]["expenses"]["Update"];
export type ExpenseCategory = Database["public"]["Enums"]["expense_category"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: "grocery", label: "Grocery" },
  { value: "staff_salary", label: "Staff Salary" },
  { value: "electricity_bill", label: "Electricity Bill" },
  { value: "water_bill", label: "Water Bill" },
  { value: "gas_cylinder", label: "Gas Cylinder" },
  { value: "maintenance", label: "Maintenance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "utensils", label: "Utensils" },
  { value: "other", label: "Other" },
];

export const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
];

export const expenseRepository = {
  async listBetween(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", startDate)
      .lte("expense_date", endDate)
      .order("expense_date", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(payload: ExpenseInsert) {
    const { error } = await supabase.from("expenses").insert({
      ...payload,
      id: payload.id || undefined,
    });
    if (error) throw error;
  },

  async update(id: string, payload: ExpenseUpdate) {
    const { error } = await supabase
      .from("expenses")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  },
};

export const expenseService = {
  listMonthly(monthDate: Date) {
    const { start, end } = monthRange(monthDate);
    return expenseRepository.listBetween(start, end);
  },

  save(payload: ExpenseInsert, id?: string) {
    return id ? expenseRepository.update(id, payload) : expenseRepository.create(payload);
  },

  delete(id: string) {
    return expenseRepository.remove(id);
  },
};

export function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function categoryLabel(value: ExpenseCategory | string) {
  return expenseCategories.find((category) => category.value === value)?.label ?? value;
}

export function paymentMethodLabel(value: PaymentMethod | string) {
  return paymentMethods.find((method) => method.value === value)?.label ?? value;
}

