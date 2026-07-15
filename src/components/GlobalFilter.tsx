import * as React from "react";
import { Search, Filter, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

interface GlobalFilterProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  
  // Date Range support
  showDateRange?: boolean;
  dateRange?: DateRange | undefined;
  onDateRangeChange?: (range: DateRange | undefined) => void;

  // Generic Dropdown filters (e.g. Status, Category)
  filterGroups?: FilterGroup[];
  selectedFilters?: Record<string, string[]>;
  onFilterChange?: (groupId: string, values: string[]) => void;
}

export function GlobalFilter({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  showDateRange,
  dateRange,
  onDateRangeChange,
  filterGroups = [],
  selectedFilters = {},
  onFilterChange,
}: GlobalFilterProps) {
  
  const handleFilterToggle = (groupId: string, value: string) => {
    if (!onFilterChange) return;
    const currentSelected = selectedFilters[groupId] || [];
    if (currentSelected.includes(value)) {
      onFilterChange(groupId, currentSelected.filter((v) => v !== value));
    } else {
      onFilterChange(groupId, [...currentSelected, value]);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center w-full bg-card p-2 rounded-md border border-border shadow-sm">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 bg-transparent border-none shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
        {showDateRange && onDateRangeChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal shrink-0",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onDateRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {filterGroups.map((group) => (
          <DropdownMenu key={group.id}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0 gap-2">
                <Filter className="h-4 w-4" />
                {group.label}
                {(selectedFilters[group.id]?.length || 0) > 0 && (
                  <span className="ml-1 rounded-full bg-primary w-5 h-5 text-[10px] flex items-center justify-center text-primary-foreground">
                    {selectedFilters[group.id].length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by {group.label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {group.options.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={selectedFilters[group.id]?.includes(opt.value)}
                  onCheckedChange={() => handleFilterToggle(group.id, opt.value)}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>
    </div>
  );
}
