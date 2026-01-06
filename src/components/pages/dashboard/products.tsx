"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { PlusCircle, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/container/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { UseFetchProducts } from "@/features/products/api/use-fetch-products";
import { useUpdateSearchParams } from "@/hooks/use-search-params";
import { Availability, Product, Size } from "@/types/product";
import { CardProduct } from "@/features/products/components/card-product";
import { FormProvider, useForm } from "react-hook-form";
import { filterSchema, FilterSchema } from "@/features/products/form/filter";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductFilterForm } from "@/features/products/components/filter-product";
import { UseDeleteProduct } from "@/features/products/api/use-delete-product";
import {
  ProductFormValues,
  ProductSchema,
  productSchemaWithId,
} from "@/features/products/form/product";
import ProductForm from "@/features/products/components/product-form";
import { UseCreateProduct } from "@/features/products/api/use-create-product";
import { UseUpdateProduct } from "@/features/products/api/use-update-product";
import CategoryList from "@/features/categories/components/category-list";

const initialValueFormProduct: ProductSchema = {
  name: "",
  price: 0,
  stock: 0,
  description: "",
  imageUrl: undefined,
  size: Size.MEDIUM,
  availability: Availability.READY,
  variant: [],
  category: { id: "", key: "", name: "" },
  // type: { id: "", key: "", name: "" },
  objective: { id: "", key: "", name: "" },
  color: { id: "", key: "", name: "" },
  removeImagePublicIds: [],
};

export default function DashboardProducts() {
  const { toast } = useToast();
  const { params, updateParams, resetParams } = useUpdateSearchParams();
  const [page, setPage] = useState<number>(Number(params.page) || 1);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");

  const { data: products, refetch } = UseFetchProducts({
    categories:
      typeof params.categories === "string" ? params.categories.split(",") : [],
    size: typeof params.size === "string" ? params.size.split(",") : [],
    availability:
      typeof params.availability === "string"
        ? params.availability.split(",")
        : [],
    limit:
      typeof params.limit === "string"
        ? params.limit === "all"
          ? "all"
          : parseInt(params.limit)
        : 1000,
    page,
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: createProduct, isPending: createProductPending } =
    UseCreateProduct({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Produk berhasil dibuat",
        });
        setOpen(false);
        refetch();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const { mutate: updateProduct, isPending: updateProductPending } =
    UseUpdateProduct({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Produk berhasil diperbarui",
        });
        setOpen(false);
        refetch();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const { mutate: deleteProduct } = UseDeleteProduct({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Produk berhasil dihapus",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filterForm = useForm<FilterSchema>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      categories:
        typeof params.categories === "string"
          ? params.categories.split(",")
          : [],
      size: typeof params.size === "string" ? params.size.split(",") : [],
      availability:
        typeof params.availability === "string"
          ? params.availability.split(",")
          : [],
      pageSize:
        typeof params.limit === "string"
          ? params.limit === "all"
            ? ("all" as const)
            : parseInt(params.limit)
          : 1000,
    },
  });

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchemaWithId),
    defaultValues: initialValueFormProduct,
  });

  const onSubmitFilter = (values: FilterSchema) => {
    updateParams({
      categories: values.categories?.length
        ? values.categories.join(",")
        : null,
      size: values.size?.length ? values.size.join(",") : null,
      availability: values.availability?.length
        ? values.availability.join(",")
        : null,
      limit: String(values.pageSize ?? 1000),
    });
  };

  const handleSubmitFormProduct = (data: ProductFormValues) => {
    if (editMode === "edit") {
      updateProduct({ id: data.id!, product: data });
    } else {
      createProduct(data);
    }
  };

  const handleCreateProduct = () => {
    productForm.reset(initialValueFormProduct);
    setEditMode("create");
    setOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    const productForForm: ProductFormValues = {
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description,
      imageUrl: Array.isArray(product.imageUrl) ? undefined : product.imageUrl,
      images:
        (product as any)?.images ??
        (Array.isArray((product as any)?.imageUrl)
          ? (product as any)?.imageUrl
          : []),
      size: product.size,
      availability: product.availability,
      variant: product.variant,
      category: product.category,
      // type: (product as any).type ?? { id: "", key: "", name: "" },
      objective: product.objective ?? { id: "", key: "", name: "" },
      color: product.color ?? { id: "", key: "", name: "" },
      removeImagePublicIds: [],
    };
    productForm.reset(productForForm);
    setEditMode("edit");
    setOpen(true);
  };

  const handlePageChange = (page: number) => {
    setPage(page);
    updateParams({ page: page.toString() });
  };

  const handleRemoveFilterItem = useCallback(
    (key: string, item: string, value: string | null) => {
      const currentItems = value?.split(",").filter(Boolean) || [];
      const newItems = currentItems.filter((i) => i !== item);
      updateParams({
        [key]: newItems.length > 0 ? newItems.join(",") : null,
      });
    },
    [updateParams]
  );

  useEffect(() => {
    const fields = ["categories", "size", "availability"] as const;

    fields.forEach((field) => {
      const value = params[field];
      filterForm.setValue(
        field,
        typeof value === "string" ? value.split(",") : []
      );
    });

    // Sync pageSize from query param 'limit'
    const limitParam = params.limit;
    filterForm.setValue(
      "pageSize",
      typeof limitParam === "string"
        ? limitParam === "all"
          ? ("all" as const)
          : parseInt(limitParam)
        : 1000
    );
  }, [params, filterForm]);

  useEffect(() => {
    if (!open) {
      productForm.reset(initialValueFormProduct);
      setEditMode("create");
    }
  }, [open, productForm]);

  const handleResetFilter = () => {
    filterForm.reset({
      categories: [],
      size: [],
      availability: [],
    });
    resetParams();
  };

  const loadingStateFormProduct = createProductPending || updateProductPending;

  return (
    <div className="flex flex-col gap-6">
      {/* Category List Section */}
      <CategoryList />

      {/* Product Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daftar Produk</h1>
        <p className="text-muted-foreground">
          Kelola daftar produk toko bunga Anda
        </p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Total: {products?.total} produk
        </p>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
                {Object.keys(params).length > 0 && (
                  <span>
                    {Object.values(params).reduce((count, value) => {
                      if (typeof value === "string") {
                        return count + value.split(",").filter(Boolean).length;
                      }
                      return count;
                    }, 0)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <FormProvider {...filterForm}>
                <ProductFilterForm
                  onSubmit={onSubmitFilter}
                  variant="floating"
                />
              </FormProvider>
            </PopoverContent>
          </Popover>

          <Button
            className="flex items-center gap-2"
            onClick={handleCreateProduct}
          >
            <PlusCircle className="h-4 w-4" />
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* Filter Badge */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm font-medium">Filter Aktif:</span>
        {Object.entries(params).map(([key, value]) =>
          typeof value === "string"
            ? value
                .split(",")
                .filter(Boolean)
                .map((item, index) => (
                  <Badge
                    key={`${key}-${index}`}
                    variant="secondary"
                    className="capitalize"
                  >
                    {item.replaceAll("_", " ")}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => handleRemoveFilterItem(key, item, value)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))
            : null
        )}
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-muted-foreground">
        Menampilkan {products?.data?.length} produk
      </div>

      {/* Product List */}
      {products?.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">
            Tidak ada produk yang ditemukan
          </h3>
          <p className="text-muted-foreground mb-4">
            Coba ubah filter atau reset semua filter
          </p>
          <Button onClick={handleResetFilter}>Reset Filter</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {products?.data?.map((product: Product) => (
            <CardProduct
              variant="control"
              product={product}
              key={product?.id}
              editProduct={handleEditProduct}
              deleteProduct={deleteProduct}
            />
          ))}
        </div>
      )}

      {/* Pagination Component */}
      {(products?.totalPages ?? 1) > 1 && (
        <Pagination
          page={products?.page ?? 1}
          setPage={setPage}
          totalPages={products?.totalPages ?? 1}
          handleQueryParams={handlePageChange}
          className="mt-6"
        />
      )}

      {/* Form Product */}
      <FormProvider {...productForm}>
        <ProductForm
          open={open}
          onOpenChange={setOpen}
          onSubmit={handleSubmitFormProduct}
          mode={editMode}
          loading={loadingStateFormProduct}
        />
      </FormProvider>
    </div>
  );
}
