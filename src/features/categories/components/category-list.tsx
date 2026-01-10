"use client";

import { useState } from "react";
import { PlusCircle, Trash2, Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, categorySchemaWithId, type CategoryFormValues, type CategoryFormValuesWithId } from "@/schemas/category";
import { useFetchCategories } from "@/features/categories/api/use-fetch-categories";
import { useCreateCategory } from "@/features/categories/api/use-create-category";
import { useDeleteCategory } from "@/features/categories/api/use-delete-category";
import { useUpdateCategory } from "@/features/categories/api/use-update-category";
import { useConfirm } from "@/hooks/use-confirm";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/types/category";

export default function CategoryList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: categories,
    isLoading,
    isError,
  } = useFetchCategories({
    search: searchQuery,
  });

  const { mutate: createCategory, isPending: isCreating } = useCreateCategory({
    onSuccess: () => {
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Category creation failed in hook:", error);
    }
  });

  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory({
    onSuccess: () => {
      setIsEditDialogOpen(false);
    },
  });

  const [ConfirmDialog, confirm] = useConfirm(
    "Hapus Kategori",
    "Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan.",
  );

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      key: "",
      name: "",
      description: "",
    },
  });

  const editForm = useForm<CategoryFormValuesWithId>({
    resolver: zodResolver(categorySchemaWithId),
    defaultValues: {
      id: "",
      key: "",
      name: "",
      description: "",
    },
  });

  const handleSubmit = (values: CategoryFormValues) => {
    console.log("Submitting category form:", values);
    createCategory(values);
  };

  const handleDelete = async (id: string, name?: string) => {
    const ok = await confirm({
      title: "Konfirmasi Penghapusan",
      message: `Apakah Anda yakin ingin menghapus kategori "${name ?? ""}"? Tindakan ini tidak dapat dibatalkan.`,
    });
    if (ok) {
      deleteCategory(id);
    }
  };

  const handleOpenDialog = () => {
    form.reset();
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (category: Category) => {
    editForm.reset({
      id: category.id,
      key: category.key,
      name: category.name,
      description: category.description ?? "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitEdit = (values: CategoryFormValuesWithId) => {
    const { id, key, name, description } = values;
    updateCategory({ id: id!, key, name, description });
  };

  // Fitur Show dihapus; informasi cukup ditampilkan saat Edit

  return (
    <>
      <ConfirmDialog />

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daftar Kategori Produk</CardTitle>
              <CardDescription>
                Kelola kategori produk untuk memudahkan klasifikasi produk Anda
              </CardDescription>
            </div>
            <Button
              onClick={handleOpenDialog}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Tambah Kategori
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                name="search"
                placeholder="Cari kategori..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Categories Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">Gagal memuat data kategori</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Coba Lagi
              </Button>
            </div>
          ) : categories?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📁</div>
              <h3 className="text-xl font-semibold mb-2">Belum Ada Kategori</h3>
              <p className="text-muted-foreground mb-4">
                Mulai dengan menambahkan kategori produk pertama Anda
              </p>
              <Button onClick={handleOpenDialog}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Tambah Kategori Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories?.map((category) => (
                <Card
                  key={category.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {category.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {category.key}
                        </Badge>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                          onClick={() => handleOpenEditDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(category.id, category.name)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Category Count */}
          {categories && categories.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total: {categories.length} kategori
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Kategori Baru</DialogTitle>
            <DialogDescription>
              Buat kategori baru untuk mengorganisir produk Anda
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Kategori</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="contoh: bouquet-mawar"
                        {...field}
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormDescription>
                      Key unik untuk kategori (huruf kecil, angka, underscore,
                      dash)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="contoh: Bouquet Mawar"
                        {...field}
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormDescription>
                      Nama kategori yang akan ditampilkan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Deskripsi singkat tentang kategori ini..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isCreating}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Menyimpan..." : "Simpan Kategori"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Kategori</DialogTitle>
            <DialogDescription>
              Ubah informasi kategori produk
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleSubmitEdit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="contoh: bouquet-mawar" {...field} disabled={isUpdating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="contoh: Bouquet Mawar" {...field} disabled={isUpdating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Deskripsi singkat tentang kategori ini..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        disabled={isUpdating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>
                  Batal
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Show Category Dialog dihapus sesuai permintaan */}
    </>
  );
}
