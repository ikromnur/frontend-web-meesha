"use client";

import React from "react";
import Image from "next/image";
import { useCustomersToday } from "@/features/customers/api/use-customers-today";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardCustomersPage() {
  const { data: customers = [], isLoading } = useCustomersToday();

  return (
    <div className="container mx-auto px-4 py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pelanggan Baru</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pelanggan yang mendaftar hari ini
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : customers.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              Belum ada pendaftaran baru hari ini.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foto Profil</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>No HP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.avatarUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                          <Image
                            src={c.avatarUrl}
                            alt={c.username}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                          {c.username
                            .split("_")
                            .join(" ")
                            .split(" ")
                            .map((n) => n?.[0]?.toUpperCase() ?? "")
                            .slice(0, 2)
                            .join("") || "US"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{c.username}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.noHp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}