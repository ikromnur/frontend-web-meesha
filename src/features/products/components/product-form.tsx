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
import { useFetchCategories } from "@/features/categories/api/use-fetch-categories";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/helper/format-rupiah";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Availability, Size } from "@/types/product";

type SelectItemType = {
  id: string;
  key: string;
  name: string;
};

const sizeLabels: Record<Size, string> = {
  [Size.SMALL]: "Kecil",
  [Size.MEDIUM]: "Sedang",
  [Size.LARGE]: "Besar",
  [Size.XL]: "Sangat Besar",
};

const availabilityLabels: Record<Availability, string> = {
  [Availability.READY]: "Ready di toko",
  [Availability.PO_2_DAY]: "PO 2 hari",
  [Availability.PO_5_DAY]: "PO 5 hari",
};

// Preset default options moved outside component to avoid useEffect deps warning
const DEFAULT_OBJECTIVES: SelectItemType[] = [
  { id: "birthday", key: "birthday", name: "Ulang Tahun" },
  { id: "anniversary", key: "anniversary", name: "Anniversary" },
  { id: "graduation", key: "graduation", name: "Wisuda" },
  { id: "wedding", key: "wedding", name: "Pernikahan" },
  { id: "valentine", key: "valentine", name: "Valentine" },
];

const DEFAULT_COLORS: SelectItemType[] = [
  { id: "pink", key: "pink", name: "Pink" },
  { id: "merah", key: "merah", name: "Merah" },
  { id: "hitam", key: "hitam", name: "Hitam" },
  { id: "biru", key: "biru", name: "Biru" },
  { id: "putih", key: "putih", name: "Putih" },
];

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
  const { data: categories } = useFetchCategories();
  const [inputValue, setInputValue] = useState("");
  const [inputObjective, setInputObjective] = useState("");
  const [inputColor, setInputColor] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imagesPreview, setImagesPreview] = useState<string[]>([]);
  const form = useFormContext<ProductSchema>();

  const imageFile = form.watch("imageUrl");
  const imagesField = form.watch("images");

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

  useEffect(() => {
    if (!imagesField || !Array.isArray(imagesField)) {
      setImagesPreview([]);
      return;
    }
    const urls: string[] = [];
    const revokes: string[] = [];
    imagesField.forEach((img: any) => {
      if (img instanceof File) {
        const url = URL.createObjectURL(img);
        urls.push(url);
        revokes.push(url);
      } else if (typeof img === "string") {
        urls.push(img);
      } else if (img && typeof img === "object" && img.url) {
        urls.push(img.url);
      }
    });
    setImagesPreview(urls);
    return () => {
      revokes.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [imagesField]);
  const totalPhotos = (imagesPreview.length || 0) + (preview ? 1 : 0);

  // Helpers: append/remove images for thumbnails
  const appendImages = (files: File[]) => {
    const current = Array.isArray(form.getValues("images"))
      ? (form.getValues("images") as any[])
      : [];
    const onlyFiles = current.filter((v) => v instanceof File);
    const merged = [...onlyFiles, ...files].slice(0, 5);
    form.setValue("images", merged);
  };

  const removeImageAt = (idx: number) => {
    const current = Array.isArray(form.getValues("images"))
      ? (form.getValues("images") as any[])
      : [];
    const itemToRemove = current[idx];

    // Jika item yang dihapus adalah object (gambar dari server), simpan publicId-nya
    if (
      itemToRemove &&
      typeof itemToRemove === "object" &&
      !(itemToRemove instanceof File) &&
      itemToRemove.publicId
    ) {
      const currentRemoved = form.getValues("removeImagePublicIds") || [];
      form.setValue("removeImagePublicIds", [
        ...currentRemoved,
        itemToRemove.publicId,
      ]);
    }

    const next = current.filter((_, i) => i !== idx);
    form.setValue("images", next);
  };

  // Catatan: fitur pemotongan (crop) dihapus sesuai permintaan

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const [objectiveOptions, setObjectiveOptions] =
    useState<SelectItemType[]>(DEFAULT_OBJECTIVES);
  const [colorOptions, setColorOptions] =
    useState<SelectItemType[]>(DEFAULT_COLORS);

  useEffect(() => {
    if (filters?.objectives?.length) {
      const merged = [...DEFAULT_OBJECTIVES];
      filters.objectives.forEach((o: SelectItemType) => {
        if (!merged.find((m) => m.id === o.id)) merged.push(o);
      });
      setObjectiveOptions(merged);
    }
    if (filters?.colors?.length) {
      const merged = [...DEFAULT_COLORS];
      filters.colors.forEach((c: SelectItemType) => {
        if (!merged.find((m) => m.id === c.id)) merged.push(c);
      });
      setColorOptions(merged);
    }
  }, [filters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Produk" : "Tambah Produk"}
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
            {/* Gambar Utama field removed */}

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{`Tambahkan Foto (${totalPhotos}/5)`}</FormLabel>
                  <FormControl>
                    <div className="mt-1 grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {/* Thumbnail tiles */}
                      {imagesPreview.map((src, idx) => (
                        <div key={idx} className="relative group">
                          <Image
                            width={160}
                            height={160}
                            src={src}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-24 sm:h-28 object-cover rounded-md border"
                          />
                          <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              aria-label="Hapus foto"
                              title="Hapus foto"
                              className="h-7 w-7 rounded-full"
                              onClick={() => removeImageAt(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {/* Add tile with dashed border and drag-drop */}
                      {totalPhotos < 5 && (
                        <label
                          htmlFor="add-photos-input"
                          className="flex items-center justify-center h-24 sm:h-28 rounded-md border-2 border-dashed border-orange-400 text-orange-600 hover:bg-orange-50 cursor-pointer transition-colors text-sm font-medium"
                          aria-label="Tambahkan foto produk"
                          title="Tarik & lepas atau klik untuk menambah foto"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const files = Array.from(
                              e.dataTransfer.files || []
                            ).filter((f) => f.type.startsWith("image/"));
                            if (files.length) appendImages(files);
                          }}
                        >
                          Tambahkan Foto ({Math.min(totalPhotos, 5)}/5)
                          <input
                            id="add-photos-input"
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const incoming = Array.from(e.target.files || []);
                              appendImages(incoming);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  {totalPhotos === 0 && (
                    <p className="text-xs text-red-500">
                      Foto dibutuhkan, pastikan produk ini setidaknya memiliki
                      satu foto.
                    </p>
                  )}
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
                        const selected = categories?.find(
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
                        {categories
                          ?.filter(
                            (c: SelectItemType) => c.id && c.id.trim() !== ""
                          )
                          .map((category: SelectItemType) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Type field removed */}
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
                            placeholder="Tambahkan Varian (misal: Cantik)"
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
            {/* Untuk Acara (Objective) */}
            <FormField
              control={form.control}
              name="objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Untuk acara</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_OBJECTIVES.map((obj) => (
                          <Button
                            key={obj.id}
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => field.onChange(obj)}
                          >
                            {obj.name}
                          </Button>
                        ))}
                      </div>
                      <div>
                        <Select
                          onValueChange={(selectedId) => {
                            const selected = objectiveOptions.find(
                              (opt) => opt.id === selectedId
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
                            {objectiveOptions
                              .filter((o) => o.id && o.id.trim() !== "")
                              .map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Tambahkan acara lain"
                          value={inputObjective}
                          onChange={(e) => setInputObjective(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const name = inputObjective.trim();
                              if (!name) return;
                              const key = slugify(name);
                              const item = { id: key, key, name };
                              setObjectiveOptions((prev) =>
                                prev.find((p) => p.id === item.id)
                                  ? prev
                                  : [...prev, item]
                                );
                              field.onChange(item);
                              setInputObjective("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            const name = inputObjective.trim();
                            if (!name) return;
                            const key = slugify(name);
                            const item = { id: key, key, name };
                            setObjectiveOptions((prev) =>
                              prev.find((p) => p.id === item.id)
                                ? prev
                                : [...prev, item]
                            );
                            field.onChange(item);
                            setInputObjective("");
                          }}
                        >
                          Tambah
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Tema Warna (Color) */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tema warna</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_COLORS.map((c) => (
                          <Button
                            key={c.id}
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => field.onChange(c)}
                          >
                            {c.name}
                          </Button>
                        ))}
                      </div>
                      <div>
                        <Select
                          onValueChange={(selectedId) => {
                            const selected = colorOptions.find(
                              (opt) => opt.id === selectedId
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
                            {colorOptions
                              .filter((o) => o.id && o.id.trim() !== "")
                              .map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Tambahkan warna lain"
                          value={inputColor}
                          onChange={(e) => setInputColor(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const name = inputColor.trim();
                              if (!name) return;
                              const key = slugify(name);
                              const item = { id: key, key, name };
                              setColorOptions((prev) =>
                                prev.find((p) => p.id === item.id)
                                  ? prev
                                  : [...prev, item]
                              );
                              field.onChange(item);
                              setInputColor("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            const name = inputColor.trim();
                            if (!name) return;
                            const key = slugify(name);
                            const item = { id: key, key, name };
                            setColorOptions((prev) =>
                              prev.find((p) => p.id === item.id)
                                ? prev
                                : [...prev, item]
                            );
                            field.onChange(item);
                            setInputColor("");
                          }}
                        >
                          Tambah
                        </Button>
                      </div>
                    </div>
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
                        <SelectValue placeholder="Pilih ukuran" />
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
            {/* Availability */}
            <FormField
              control={form.control}
              name="availability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ketersediaan</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih ketersediaan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Availability).map((value) => (
                          <SelectItem key={value} value={value}>
                            {availabilityLabels[value]}
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
            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              {Object.keys(form.formState.errors).length > 0 && (
                <div className="text-sm text-red-500 font-medium self-center">
                  Gagal menyimpan: Cek kolom{" "}
                  {Object.keys(form.formState.errors).join(", ")}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Memproses..." : "Simpan"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;