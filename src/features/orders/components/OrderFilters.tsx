"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { OrderStatus } from "../types/order.types";

interface OrderFiltersProps {
  selectedDate: Date | undefined;
  selectedStatus: OrderStatus | "all";
  onDateChange: (date: Date | undefined) => void;
  onStatusChange: (status: OrderStatus | "all") => void;
  stats?: {
    all: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  selectedDate,
  selectedStatus,
  onDateChange,
  onStatusChange,
  stats,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleTodayClick = () => {
    onDateChange(new Date());
    setIsCalendarOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    onDateChange(date);
    setIsCalendarOpen(false);
  };

  const statusTabs = [
    { value: "pending", label: "Pending", count: stats?.pending || 0 },
    { value: "processing", label: "Proses", count: stats?.processing || 0 },
    { value: "completed", label: "Selesai", count: stats?.completed || 0 },
    { value: "cancelled", label: "Dibatalkan", count: stats?.cancelled || 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Date Filter */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleTodayClick}
          variant={
            selectedDate &&
            format(selectedDate, "yyyy-MM-dd") ===
              format(new Date(), "yyyy-MM-dd")
              ? "default"
              : "outline"
          }
          size="default"
        >
          Hari ini
        </Button>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, "dd MMMM yyyy", { locale: id })
              ) : (
                <span>Pilih Tanggal</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              locale={id}
            />
          </PopoverContent>
        </Popover>

        {selectedDate && (
          <Button
            onClick={() => onDateChange(undefined)}
            variant="ghost"
            size="sm"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Status Tabs */}
      <Tabs
        value={selectedStatus}
        onValueChange={(value) => onStatusChange(value as OrderStatus | "all")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5 h-auto">
          {statusTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative py-2"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium">{tab.label}</span>
                <span className="text-xs opacity-80">{tab.count} pesanan</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default OrderFilters;
