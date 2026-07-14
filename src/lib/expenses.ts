import type { Database } from "@/integrations/supabase/types";

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

const STORAGE_KEY = "messmate.expenses";

export const expenseRepository = {
  async listBetween(startDate: string, endDate: string) {
    return readExpenses()
      .filter((expense) => expense.expense_date >= startDate && expense.expense_date <= endDate)
      .sort(sortExpenses);
  },

  async create(payload: ExpenseInsert) {
    const now = new Date().toISOString();
    const expense: Expense = {
      id: payload.id ?? createId(),
      expense_date: payload.expense_date ?? formatDate(new Date()),
      category: payload.category,
      title: payload.title,
      description: payload.description ?? null,
      amount: payload.amount,
      payment_method: payload.payment_method,
      added_by: payload.added_by ?? "Admin User",
      created_at: payload.created_at ?? now,
      updated_at: payload.updated_at ?? now,
    };
    writeExpenses([expense, ...readExpenses()].sort(sortExpenses));
  },

  async update(id: string, payload: ExpenseUpdate) {
    const expenses = readExpenses();
    const index = expenses.findIndex((expense) => expense.id === id);
    if (index === -1) throw new Error("Expense not found.");

    expenses[index] = {
      ...expenses[index],
      ...payload,
      id,
      updated_at: new Date().toISOString(),
    };
    writeExpenses(expenses.sort(sortExpenses));
  },

  async remove(id: string) {
    writeExpenses(readExpenses().filter((expense) => expense.id !== id));
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

function readExpenses(): Expense[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isExpense) : [];
  } catch {
    return [];
  }
}

function writeExpenses(expenses: Expense[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function sortExpenses(a: Expense, b: Expense) {
  const byDate = b.expense_date.localeCompare(a.expense_date);
  if (byDate !== 0) return byDate;
  return b.created_at.localeCompare(a.created_at);
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object") return false;
  const expense = value as Partial<Expense>;
  return (
    typeof expense.id === "string" &&
    typeof expense.expense_date === "string" &&
    typeof expense.title === "string" &&
    typeof expense.amount === "number" &&
    typeof expense.added_by === "string" &&
    typeof expense.created_at === "string" &&
    typeof expense.updated_at === "string" &&
    expenseCategories.some((category) => category.value === expense.category) &&
    paymentMethods.some((method) => method.value === expense.payment_method)
  );
}
