"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useEffect, useState } from "react";
import { ProductSchema } from "../form/product";
import { useFormContext } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFetchFilter } from "../api/use-fetch-filter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/helper/format-rupiah";
import Image from "next/image";
import { Size } from "@/types/product";

type SelectItemType = {
  id: string;
  key: string;
  name: string;
};

const sizeLabels: Record<Size, string> = {
  [Size.SMALL]: "Small",
  [Size.MEDIUM]: "Medium",
  [Size.LARGE]: "Large",
  [Size.XL]: "Extra Large",
};

interface ProductFormProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmit: (data: ProductSchema) => void;
  mode?: "create" | "edit";
  loading?: boolean;
}
const ProductForm = ({
  open,
  onOpenChange,
  onSubmit,
  mode = "create",
  loading = false,
}: ProductFormProps) => {
  const { data: filters } = UseFetchFilter({
    onError: (error) => {
      console.error(error);
    },
  });
  const [inputValue, setInputValue] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const form = useFormContext<ProductSchema>();

  const imageFile = form.watch("imageUrl");

  useEffect(() => {
    if (!imageFile) {
      return setPreview(null);
    }

    // Pastikan imageFile adalah File, bukan objek gambar lama
    if (imageFile instanceof File) {
      const url = URL.createObjectURL(imageFile);
      setPreview(url);

      return () => URL.revokeObjectURL(url);
    }

    // Jika imageFile adalah objek lama (url dan publicId), set preview langsung dari url
    if (typeof imageFile === "object" && imageFile?.url) {
      setPreview(imageFile.url);
    }
  }, [imageFile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Product" : "Create Product"}
          </DialogTitle>
          <DialogDescription>
            {mode == "edit" ? "Edit informasi produk" : "Tambahkan produk baru"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-2 py-2"
          >
            {preview && (
              <Image
                width={200}
                height={200}
                src={preview}
                alt="Preview"
                className="mt-2 w-full h-auto object-cover rounded-md"
              />
            )}

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gambar Produk</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          field.onChange(file);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori Produk</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(selectedId) => {
                        const selected = filters?.categories?.find(
                          (cat: SelectItemType) => cat.id === selectedId
                        );
                        if (selected) {
                          field.onChange(selected);
                        }
                      }}
                      value={field.value?.id ?? ""}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder="Pilih kategori"
                          defaultValue={field.value?.name}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filters?.categories?.map(
                          (category: SelectItemType) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama produk</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Masukkan nama produk"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              {/* Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Produk</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Masukkan harga produk"
                        value={formatRupiah(field.value)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          const value = parseInt(raw || "0", 10);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Stock */}
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok produk</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Masukkan stok produk"
                        min={0}
                        value={field.value}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          field.onChange(isNaN(value) || value < 0 ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi produk</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan deskripsi produk"
                      className="min-h-44"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Variant */}
            <FormField
              control={form.control}
              name="variant"
              render={({ field }) => {
                const handleAddVariant = () => {
                  const trimmed = inputValue.trim();
                  if (trimmed && !field.value.includes(trimmed)) {
                    field.onChange([...field.value, trimmed]);
                    setInputValue("");
                  }
                };

                const handleRemove = (variantToRemove: string) => {
                  const updated = field.value.filter(
                    (v) => v !== variantToRemove
                  );
                  field.onChange(updated);
                };

                return (
                  <FormItem>
                    <FormLabel>Varian Produk</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Tambahkan varian (misal: Merah)"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddVariant();
                              }
                            }}
                          />
                          <Button type="button" onClick={handleAddVariant}>
                            Tambah
                          </Button>
                        </div>

                        {/* Tampilkan daftar variant */}
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((variant, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-muted px-3 py-1 rounded-full"
                            >
                              <span className="mr-2 text-sm">{variant}</span>
                              <button
                                type="button"
                                onClick={() => handleRemove(variant)}
                                className="text-sm text-red-500 hover:text-red-700"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            {/* Objective */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Untuk acara</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(selectedId) => {
                        const selected = filters?.types?.find(
                          (cat: SelectItemType) => cat.id === selectedId
                        );
                        if (selected) {
                          field.onChange(selected);
                        }
                      }}
                      value={field.value?.id ?? ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih acara" />
                      </SelectTrigger>
                      <SelectContent>
                        {filters?.types?.map((type: SelectItemType) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Type */}
            <FormField
              control={form.control}
              name="objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(selectedId) => {
                        const selected = filters?.objectives?.find(
                          (cat: SelectItemType) => cat.id === selectedId
                        );
                        if (selected) {
                          field.onChange(selected);
                        }
                      }}
                      value={field.value?.id ?? ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih acara" />
                      </SelectTrigger>
                      <SelectContent>
                        {filters?.objectives?.map(
                          (objective: SelectItemType) => (
                            <SelectItem key={objective.id} value={objective.id}>
                              {objective.name}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tema warna</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(selectedId) => {
                        const selected = filters?.colors?.find(
                          (cat: SelectItemType) => cat.id === selectedId
                        );
                        if (selected) {
                          field.onChange(selected);
                        }
                      }}
                      value={field.value?.id ?? ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih warna" />
                      </SelectTrigger>
                      <SelectContent>
                        {filters?.colors?.map((color: SelectItemType) => (
                          <SelectItem key={color.id} value={color.id}>
                            {color.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Sizes */}
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ukuran</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih warna" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Size).map((value) => (
                          <SelectItem key={value} value={value}>
                            {sizeLabels[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription />
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Memproses..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;
