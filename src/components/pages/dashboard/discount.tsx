"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Trash2, Pencil } from "lucide-react";
import { type Discount } from "@/types/discount";
import { EditDiscountForm } from "@/features/discount/components/edit-discount-form";
import { UseFetchDiscounts } from "@/features/discount/api/use-fetch-discounts";
import { useDeleteDiscount } from "@/features/discount/api/use-delete-discount";
import { CreateDiscountForm } from "@/features/discount/components/create-discount-form";
import { useConfirm } from "@/hooks/use-confirm";
import { formatRupiah } from "@/helper/format-rupiah";
import { cn } from "@/lib/utils";

const DiscountPage = () => {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const { data: discounts, isLoading, isError } = UseFetchDiscounts();
  const [isEditOpen, setEditOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(
    null
  );
  const deleteMutation = useDeleteDiscount();

  const [ConfirmationDialog, confirm] = useConfirm(
    "Apakah Anda yakin?",
    "Tindakan ini tidak dapat dibatalkan."
  );

  const handleDelete = async (id: string) => {
    const ok = await confirm();
    if (ok) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (input?: string | number | Date) => {
    if (input === undefined || input === null) return "-";
    const d = new Date(input);
    if (isNaN(d.getTime())) {
      if (typeof input === "string") {
        const d2 = new Date(input.replace(" ", "T"));
        if (!isNaN(d2.getTime())) {
          return d2.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });
        }
      }
      return "-";
    }
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatValue = (type: string, value: number) => {
    if (type === "PERCENTAGE") {
      return `${value}%`;
    }
    return formatRupiah(value);
  };

  return (
    <div>
      <ConfirmationDialog />
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Diskon</h1>
        <p className="text-gray-500">Kelola diskon toko bunga anda</p>
      </div>
      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Kode Diskon</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by kode diskon"
                  className="pl-9 w-64"
                />
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>+ Buat Diskon</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Buat Kode Diskon Baru</DialogTitle>
                  </DialogHeader>
                  <CreateDiscountForm onClose={() => setCreateOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Kode Diskon</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Batas Total</TableHead>
                  <TableHead>Batas User</TableHead>
                  <TableHead>Waktu Mulai</TableHead>
                  <TableHead>Waktu Akhir</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-5" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center text-red-500"
                    >
                      Gagal memuat data diskon.
                    </TableCell>
                  </TableRow>
                ) : (
                  discounts?.map((discount, index) => (
                    <TableRow key={discount.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {discount.code}
                      </TableCell>
                      <TableCell>
                        {discount.type === "PERCENTAGE" ? "Persen" : "Nominal"}
                      </TableCell>
                      <TableCell>
                        {formatValue(discount.type, discount.value)}
                      </TableCell>
                      <TableCell>
                        {discount.usedCount ?? 0} / {discount.maxUsage ?? "∞"}
                      </TableCell>
                      <TableCell>{discount.maxUsagePerUser ?? "∞"}</TableCell>
                      <TableCell>
                        {formatDate(
                          discount.startDateMs ??
                            discount.startDate ??
                            discount.startTime
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(
                          discount.endDateMs ??
                            discount.endDate ??
                            discount.endTime
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            discount.status === "Aktif" &&
                              "bg-green-100 text-green-800 hover:bg-green-100",
                            discount.status === "Expired" &&
                              "bg-gray-100 text-gray-800 hover:bg-gray-100"
                          )}
                        >
                          {discount.status === "ACTIVE"
                            ? "Aktif"
                            : discount.status === "EXPIRED"
                            ? "Expired"
                            : discount.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedDiscount(discount);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(discount.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Edit Discount Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Kode Diskon</DialogTitle>
          </DialogHeader>
          {selectedDiscount && (
            // Lazy import via dynamic component keeps this page smaller
            // but here we directly render the edit form component
            <EditDiscountForm
              discount={selectedDiscount}
              onClose={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscountPage;
