"use client";

import React, { useState } from "react";
import {
  Order,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "../types/order.types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, Clock } from "lucide-react";
import { formatRupiah } from "@/helper/format-rupiah";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface OrderHistoryProps {
  orders: Order[];
  onSelectOrder?: (order: Order) => void;
  selectedOrderId?: number;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  orders,
  onSelectOrder,
  selectedOrderId,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      order.order_id.toLowerCase().includes(searchLower) ||
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_email.toLowerCase().includes(searchLower) ||
      order.customer_phone.includes(searchQuery)
    );
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">History Pesanan</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari pesanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-250px)]">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Package className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                {searchQuery
                  ? "Tidak ada pesanan yang ditemukan"
                  : "Belum ada history pesanan"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 px-4 pb-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder?.(order)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedOrderId === order.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {order.customer_name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {order.order_id}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${
                        ORDER_STATUS_COLORS[order.status]
                      } text-xs ml-2`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </div>

                  <div className="flex items-center text-xs text-gray-600 mb-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {(() => {
                      const toDate = (val: any) => {
                        if (!val) return null;
                        if (typeof val === "number") {
                          return new Date(val < 1e12 ? val * 1000 : val);
                        }
                        if (typeof val === "string") {
                          const s = val.trim();
                          const d = new Date(s);
                          if (!isNaN(d.getTime())) return d;
                          const d2 = new Date(s.replace(" ", "T"));
                          if (!isNaN(d2.getTime())) return d2;
                        }
                        return null;
                      };
                      const d = toDate(order.created_at);
                      return d
                        ? format(d, "dd MMM yyyy, HH:mm", { locale: id })
                        : "-";
                    })()}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-600">
                      {Array.isArray(order.products)
                        ? order.products.length
                        : 0}{" "}
                      produk
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {(() => {
                        const total =
                          typeof order.total_amount === "number"
                            ? order.total_amount
                            : Number(order.total_amount) || 0;
                        return formatRupiah(total);
                      })()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OrderHistory;
