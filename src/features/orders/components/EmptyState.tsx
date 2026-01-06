"use client";

import React from "react";
import { Package, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  variant?: "no-orders" | "no-results" | "no-orders-today";
  onReset?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = "no-orders",
  onReset,
}) => {
  const getContent = () => {
    switch (variant) {
      case "no-orders":
        return {
          icon: <Package className="w-16 h-16 text-gray-300" />,
          title: "Belum Ada Pesanan",
          description: "Belum ada pesanan yang masuk. Pesanan akan muncul di sini ketika pelanggan melakukan pemesanan.",
          showButton: false,
        };

      case "no-orders-today":
        return {
          icon: <Filter className="w-16 h-16 text-gray-300" />,
          title: "Tidak Ada Pesanan Hari Ini",
          description: "Belum ada pesanan untuk tanggal yang dipilih. Coba pilih tanggal lain atau lihat semua pesanan.",
          showButton: true,
          buttonText: "Lihat Semua Pesanan",
        };

      case "no-results":
        return {
          icon: <Search className="w-16 h-16 text-gray-300" />,
          title: "Tidak Ada Hasil",
          description: "Tidak ada pesanan yang sesuai dengan filter yang Anda pilih. Coba ubah filter atau reset pencarian.",
          showButton: true,
          buttonText: "Reset Filter",
        };

      default:
        return {
          icon: <Package className="w-16 h-16 text-gray-300" />,
          title: "Tidak Ada Data",
          description: "Tidak ada data yang tersedia saat ini.",
          showButton: false,
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="mb-6">{content.icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">
        {content.title}
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-md mb-6">
        {content.description}
      </p>
      {content.showButton && onReset && (
        <Button onClick={onReset} variant="outline">
          {content.buttonText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
