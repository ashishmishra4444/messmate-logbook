import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Wallet,
  Zap,
  ShoppingCart,
  MoreHorizontal,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Bar, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  categoryLabel,
  expenseCategories,
  expenseRepository,
  expenseService,
  formatDate,
  monthRange,
  paymentMethodLabel,
  paymentMethods,
  type Expense,
  type ExpenseCategory,
  type ExpenseInsert,
  type PaymentMethod,
} from "@/lib/expenses";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expense")({
  head: () => ({ meta: [{ title: "Expense Management — MessMate" }] }),
  component: ExpensePage,
});

type CategoryFilter = "all" | ExpenseCategory;
type PaymentFilter = "all" | PaymentMethod;
type ExpenseForm = {
  expense_date: string;
  category: ExpenseCategory | "";
  title: string;
  description: string;
  amount: string;
  payment_method: PaymentMethod | "";
  added_by: string;
};

const utilityCategories: ExpenseCategory[] = ["electricity_bill", "water_bill", "gas_cylinder"];
const pageSize = 8;

const defaultForm = (): ExpenseForm => ({
  expense_date: formatDate(new Date()),
  category: "",
  title: "",
  description: "",
  amount: "",
  payment_method: "",
  added_by: "Admin User",
});

export function ExpensePage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(() => defaultForm());

  const selectedRange = monthRange(selectedMonth);
  const rangeStart = formatDate(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 5, 1));

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["expenses", rangeStart, selectedRange.end],
    queryFn: () => expenseRepository.listBetween(rangeStart, selectedRange.end),
  });

  const monthExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          expense.expense_date >= selectedRange.start && expense.expense_date <= selectedRange.end,
      ),
    [expenses, selectedRange.end, selectedRange.start],
  );

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return monthExpenses.filter((expense) => {
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      const matchesPayment = paymentFilter === "all" || expense.payment_method === paymentFilter;
      const searchable = [
        expense.title,
        categoryLabel(expense.category),
        String(expense.amount),
        expense.description ?? "",
        expense.added_by,
      ]
        .join(" ")
        .toLowerCase();
      return matchesCategory && matchesPayment && (!query || searchable.includes(query));
    });
  }, [categoryFilter, monthExpenses, paymentFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedExpenses = filteredExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const previousMonthExpenses = expenses.filter((expense) => {
    const previous = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    const previousRange = monthRange(previous);
    return expense.expense_date >= previousRange.start && expense.expense_date <= previousRange.end;
  });

  const cards = buildCards(filteredExpenses, previousMonthExpenses, expenses, selectedMonth);
  const summary = buildMonthlySummary(filteredExpenses);
  const pieData = [
    { name: "Grocery Total", value: summary.grocery, fill: "#10B981" },
    { name: "Staff Salary Total", value: summary.staff, fill: "#3B82F6" },
    { name: "Utility Total", value: summary.utility, fill: "#F97316" },
    { name: "Other Total", value: summary.other, fill: "#A855F7" },
  ].filter((item) => item.value > 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = validateForm(form);
      await expenseService.save(payload, editingExpense?.id);
    },
    onSuccess: () => {
      toast.success(editingExpense ? "Expense updated." : "Expense saved.");
      setDrawerOpen(false);
      setEditingExpense(null);
      setForm(defaultForm());
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.delete(id),
    onSuccess: () => {
      toast.success("Expense deleted.");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreateDrawer = () => {
    setEditingExpense(null);
    setForm({
      ...defaultForm(),
      expense_date: formatDate(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), new Date().getDate())),
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      expense_date: expense.expense_date,
      category: expense.category,
      title: expense.title,
      description: expense.description ?? "",
      amount: String(expense.amount),
      payment_method: expense.payment_method,
      added_by: expense.added_by,
    });
    setDrawerOpen(true);
  };

  const resetFilters = () => {
    setCategoryFilter("all");
    setPaymentFilter("all");
    setSearch("");
    setPage(1);
  };

  const applyFilters = () => {
    setPage(1);
    toast.success("Filters applied.");
  };

  const handleMonthSelect = (date?: Date) => {
    if (!date) return;
    setSelectedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setPage(1);
  };

  const exportExcel = () => {
    const rows = filteredExpenses.map((expense) => ({
      Date: expense.expense_date,
      Category: categoryLabel(expense.category),
      Title: expense.title,
      Amount: Number(expense.amount),
      "Payment Method": paymentMethodLabel(expense.payment_method),
      "Added By": expense.added_by,
      Description: expense.description ?? "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 20 },
      { wch: 28 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 36 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, `messmate-expenses-${selectedRange.start}.xlsx`, { compression: true });
  };

  const exportPDF = () => {
    const html = buildPrintableReport(filteredExpenses, selectedMonth);
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      toast.error("Please allow popups to export PDF.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Expense Management</h1>
          <p className="text-sm text-muted-foreground">Track mess spending and monthly expense reports</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker selectedMonth={selectedMonth} onSelect={handleMonthSelect} />
          <Button className="gap-2" onClick={openCreateDrawer}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <SummaryCard key={card.label} card={card} />
        ))}
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(170px,0.9fr)_minmax(180px,1fr)_minmax(190px,1fr)_minmax(220px,1.4fr)_auto_auto]">
          <MonthPicker selectedMonth={selectedMonth} onSelect={handleMonthSelect} />
          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              setCategoryFilter(value as CategoryFilter);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="z-[70]">
              <SelectItem value="all">All Categories</SelectItem>
              {expenseCategories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={paymentFilter}
            onValueChange={(value) => {
              setPaymentFilter(value as PaymentFilter);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Payment Methods" />
            </SelectTrigger>
            <SelectContent className="z-[70]">
              <SelectItem value="all">All Payment Methods</SelectItem>
              {paymentMethods.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search expenses..."
              className="pl-9"
            />
          </div>
          <Button className="gap-2" onClick={applyFilters}>
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" className="gap-2" onClick={resetFilters}>
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Payment Method</th>
                <th className="px-4 py-3 text-left">Added By</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedExpenses.map((expense) => (
                <tr key={expense.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">{formatDisplayDate(expense.expense_date)}</td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={expense.category} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{expense.title}</div>
                    {expense.description && (
                      <div className="max-w-64 truncate text-xs text-muted-foreground">{expense.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(expense.amount)}</td>
                  <td className="px-4 py-3">
                    <PaymentBadge method={expense.payment_method} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{expense.added_by}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEditDrawer(expense)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm("Delete this expense?")) deleteMutation.mutate(expense.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {pagedExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No expenses found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>
            Showing {filteredExpenses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredExpenses.length)} of {filteredExpenses.length} entries
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 5).map((number) => (
              <Button
                key={number}
                size="sm"
                variant={number === currentPage ? "default" : "outline"}
                onClick={() => setPage(number)}
              >
                {number}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Monthly Summary ({monthLabel(selectedMonth)})</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr_220px]">
            <div className="h-52">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<DonutTooltip />} wrapperStyle={{ pointerEvents: "none" }} />
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={2}>
                      {pieData.map((item) => (
                        <Cell key={item.name} fill={item.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                  No summary data.
                </div>
              )}
            </div>
            <div className="space-y-3">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatMoney(item.value)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-primary/10 p-4 text-primary">
              <Wallet className="mb-5 h-10 w-10 opacity-60" />
              <div className="text-xs font-semibold uppercase tracking-wide">Total Monthly Expense</div>
              <div className="mt-2 text-3xl font-bold">{formatMoney(summary.total)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Export Reports</h2>
          <p className="mt-2 text-sm text-muted-foreground">Export filtered expenses in your preferred format.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2 text-emerald-700" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </Button>
            <Button variant="outline" className="gap-2 text-red-600" onClick={exportPDF}>
              <FileText className="h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>
      </section>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</SheetTitle>
            <SheetDescription>Enter expense details and save them to the monthly register.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Expense Date *</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(event) => setForm({ ...form, expense_date: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value as ExpenseCategory })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="z-[80]">
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expense Title *</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Enter expense title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Enter description (optional)"
                className="min-h-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={form.payment_method}
                onValueChange={(value) => setForm({ ...form, payment_method: value as PaymentMethod })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Payment Method" />
                </SelectTrigger>
                <SelectContent className="z-[80]">
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Added By *</Label>
              <Input
                value={form.added_by}
                onChange={(event) => setForm({ ...form, added_by: event.target.value })}
                placeholder="Admin User"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                Save Expense
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryCard({ card }: { card: ReturnType<typeof buildCards>[number] }) {
  const Icon = card.icon;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("grid h-12 w-12 place-items-center rounded-full", card.iconTone)}>
          <Icon className="h-5 w-5" />
        </div>
        <Sparkline values={card.trend} color={card.color} />
      </div>
      <div className="mt-3 text-sm font-semibold" style={{ color: card.color }}>
        {card.label}
      </div>
      <div className="mt-4 text-2xl font-bold">{formatMoney(card.value)}</div>
      <div className={cn("mt-2 text-xs", card.percent >= 0 ? "text-emerald-600" : "text-rose-600")}>
        {card.percent >= 0 ? "↑" : "↓"} {Math.abs(card.percent).toFixed(1)}% from last month
      </div>
    </div>
  );
}

function MonthPicker({ selectedMonth, onSelect }: { selectedMonth: Date; onSelect: (date?: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 lg:w-auto">
          <CalendarDays className="h-4 w-4" /> {monthLabel(selectedMonth)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[70] w-auto p-0" align="start">
        <Calendar mode="single" selected={selectedMonth} onSelect={onSelect} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 96;
      const y = 34 - (value / max) * 28;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 96 38" className="h-10 w-24 shrink-0 overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CategoryBadge({ category }: { category: ExpenseCategory }) {
  const tone = {
    grocery: "bg-emerald-50 text-emerald-700",
    staff_salary: "bg-blue-50 text-blue-700",
    electricity_bill: "bg-orange-50 text-orange-700",
    water_bill: "bg-sky-50 text-sky-700",
    gas_cylinder: "bg-amber-50 text-amber-700",
    maintenance: "bg-cyan-50 text-cyan-700",
    cleaning: "bg-purple-50 text-purple-700",
    utensils: "bg-stone-100 text-stone-700",
    other: "bg-rose-50 text-rose-700",
  }[category];
  return <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", tone)}>{categoryLabel(category)}</span>;
}

function PaymentBadge({ method }: { method: PaymentMethod }) {
  const tone = {
    cash: "bg-emerald-50 text-emerald-700",
    upi: "bg-violet-50 text-violet-700",
    bank_transfer: "bg-blue-50 text-blue-700",
    card: "bg-rose-50 text-rose-700",
  }[method];
  return <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", tone)}>{paymentMethodLabel(method)}</span>;
}

function buildCards(currentExpenses: Expense[], previousExpenses: Expense[], allExpenses: Expense[], selectedMonth: Date) {
  const definitions = [
    {
      label: "Total Expenses",
      icon: Wallet,
      color: "#7C3AED",
      iconTone: "bg-violet-100 text-violet-700",
      filter: () => true,
    },
    {
      label: "Grocery Expenses",
      icon: ShoppingCart,
      color: "#059669",
      iconTone: "bg-emerald-100 text-emerald-700",
      filter: (expense: Expense) => expense.category === "grocery",
    },
    {
      label: "Staff Salary",
      icon: Users,
      color: "#2563EB",
      iconTone: "bg-blue-100 text-blue-700",
      filter: (expense: Expense) => expense.category === "staff_salary",
    },
    {
      label: "Utility Bills",
      icon: Zap,
      color: "#F97316",
      iconTone: "bg-orange-100 text-orange-700",
      filter: (expense: Expense) => utilityCategories.includes(expense.category),
    },
    {
      label: "Other Expenses",
      icon: MoreHorizontal,
      color: "#DB2777",
      iconTone: "bg-pink-100 text-pink-700",
      filter: (expense: Expense) =>
        expense.category !== "grocery" &&
        expense.category !== "staff_salary" &&
        !utilityCategories.includes(expense.category),
    },
  ];

  return definitions.map((definition) => {
    const current = sumExpenses(currentExpenses.filter(definition.filter));
    const previous = sumExpenses(previousExpenses.filter(definition.filter));
    return {
      ...definition,
      value: current,
      percent: previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0,
      trend: buildTrend(allExpenses, selectedMonth, definition.filter),
    };
  });
}

function buildTrend(expenses: Expense[], selectedMonth: Date, filter: (expense: Expense) => boolean) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 5 + index, 1);
    const range = monthRange(date);
    return sumExpenses(
      expenses.filter(
        (expense) =>
          filter(expense) && expense.expense_date >= range.start && expense.expense_date <= range.end,
      ),
    );
  });
}

function buildMonthlySummary(expenses: Expense[]) {
  const grocery = sumExpenses(expenses.filter((expense) => expense.category === "grocery"));
  const staff = sumExpenses(expenses.filter((expense) => expense.category === "staff_salary"));
  const utility = sumExpenses(expenses.filter((expense) => utilityCategories.includes(expense.category)));
  const other = sumExpenses(
    expenses.filter(
      (expense) =>
        expense.category !== "grocery" &&
        expense.category !== "staff_salary" &&
        !utilityCategories.includes(expense.category),
    ),
  );
  return { grocery, staff, utility, other, total: grocery + staff + utility + other };
}

function validateForm(form: ExpenseForm): ExpenseInsert {
  if (!form.expense_date) throw new Error("Expense date is required.");
  if (!form.category) throw new Error("Category is required.");
  if (!form.title.trim()) throw new Error("Expense title is required.");
  if (!form.payment_method) throw new Error("Payment method is required.");
  if (!form.added_by.trim()) throw new Error("Added by is required.");
  const amount = Number(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount.");

  return {
    expense_date: form.expense_date,
    category: form.category,
    title: form.title.trim(),
    description: form.description.trim() || null,
    amount,
    payment_method: form.payment_method,
    added_by: form.added_by.trim(),
  };
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name?: string; value?: number }[] }) {
  const item = payload?.[0];
  if (!active || !item) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="font-semibold">{item.name}</div>
      <div className="text-muted-foreground">{formatMoney(item.value ?? 0)}</div>
    </div>
  );
}

function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((total, expense) => total + Number(expense.amount), 0);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatDisplayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildPrintableReport(expenses: Expense[], selectedMonth: Date) {
  const rows = expenses
    .map(
      (expense) => `
        <tr>
          <td>${escapeHtml(formatDisplayDate(expense.expense_date))}</td>
          <td>${escapeHtml(categoryLabel(expense.category))}</td>
          <td>${escapeHtml(expense.title)}</td>
          <td>${escapeHtml(formatMoney(expense.amount))}</td>
          <td>${escapeHtml(paymentMethodLabel(expense.payment_method))}</td>
          <td>${escapeHtml(expense.added_by)}</td>
        </tr>
      `,
    )
    .join("");
  return `
    <!doctype html>
    <html>
      <head>
        <title>Expense Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          p { margin: 0 0 20px; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f9fafb; text-transform: uppercase; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>MessMate Expense Report</h1>
        <p>${escapeHtml(monthLabel(selectedMonth))} · ${expenses.length} filtered entries</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Title</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Added By</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6">No expenses found.</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
