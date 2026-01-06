"use client";

import Image from "next/image";
import React, { useState } from "react";
import banner from "../../../../public/banner-3.png";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Pagination from "@/components/container/pagination";
import { useUpdateSearchParams } from "@/hooks/use-search-params";
import { ProductFilterForm } from "@/features/products/components/filter-product";
import { CardProduct } from "@/features/products/components/card-product";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CiSearch } from "react-icons/ci";
import { Product } from "@/types/product";
import { UseFetchProducts } from "@/features/products/api/use-fetch-products";
import { useToast } from "@/hooks/use-toast";
import { MdOutlineImage } from "react-icons/md";
import { Skeleton } from "@/components/ui/skeleton";
import { FormProvider, useForm } from "react-hook-form";
import { filterSchema, FilterSchema } from "@/features/products/form/filter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { PopularProductsCarousel } from "@/features/products/components/popular-products-carousel";

const ProductsPage = () => {
  const { toast } = useToast();
  const { params, updateParams } = useUpdateSearchParams();
  const [page, setPage] = useState<number>(Number(params.page) || 1);

  const { data: products, isLoading } = UseFetchProducts({
    categories:
      typeof params.categories === "string" ? params.categories.split(",") : [],
    objectives:
      typeof params.objectives === "string" ? params.objectives.split(",") : [],
    colors: typeof params.colors === "string" ? params.colors.split(",") : [],
    search: typeof params.search === "string" ? params.search : "",
    size: typeof params.size === "string" ? params.size.split(",") : [],
    availability:
      typeof params.availability === "string"
        ? params.availability.split(",")
        : [],
    gte: typeof params.gte === "string" ? parseInt(params.gte) : 0,
    lte: typeof params.lte === "string" ? parseInt(params.lte) : 0,
    // Fix page size to 12 for user listing
    limit: 12,
    page,
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sync pageSize from query param 'limit' (moved below form init)

  const form = useForm<FilterSchema>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      search: typeof params.search === "string" ? params.search : "",
      categories:
        typeof params.categories === "string"
          ? params.categories.split(",")
          : [],
      objectives:
        typeof params.objectives === "string"
          ? params.objectives.split(",")
          : [],
      colors: typeof params.colors === "string" ? params.colors.split(",") : [],
      size: typeof params.size === "string" ? params.size.split(",") : [],
      availability:
        typeof params.availability === "string"
          ? params.availability.split(",")
          : [],
      // Keep internal default to 12; control hidden for user listing
      pageSize: 12,
      budget: {
        gte: typeof params.gte === "string" ? parseInt(params.gte) : 0,
        lte: typeof params.lte === "string" ? parseInt(params.lte) : undefined,
      },
    },
  });

  // Sync pageSize from query param 'limit' (after form initialized)
  // No sync from query for pageSize on user listing (fixed to 12)
  useEffect(() => {
    form.setValue("pageSize", 12);
  }, [form]);

  const onSubmitFilter = (values: FilterSchema) => {
    updateParams({
      search: values.search || null,
      categories: values.categories?.length
        ? values.categories.join(",")
        : null,
      objectives: values.objectives?.length
        ? values.objectives.join(",")
        : null,
      colors: values.colors?.length ? values.colors.join(",") : null,
      size: values.size?.length ? values.size.join(",") : null,
      availability: values.availability?.length
        ? values.availability.join(",")
        : null,
      lte: String(values.budget?.lte) || "0",
      gte: String(values.budget?.gte) || "0",
      // Always set limit to 12 on user listing
      limit: "12",
    });
  };

  const handlePageChange = (page: number) => {
    setPage(page);
    updateParams({ page: page.toString() });
  };

  return (
    <div className="pt-4 w-full max-w-screen-xl mx-auto px-4">
      <div className="relative mb-8">
        <Image
          className="w-full min-h-52 object-cover rounded-lg"
          src={banner}
          width={1170}
          height={393}
          alt="banner"
        />
        <h1 className="text-white font-semibold text-4xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md text-center w-full">
          Flowers in stylish disguise
        </h1>
      </div>
      {/* Popular Products Carousel */}
      <PopularProductsCarousel
        title="Produk Populer"
        limit={10}
        className="mb-10"
      />
      <div className="flex justify-between gap-4">
        <section className="max-w-96 w-full hidden lg:block p-3">
          <FormProvider {...form}>
            <ProductFilterForm onSubmit={onSubmitFilter} />
          </FormProvider>
        </section>
        <section className="flex-1 flex flex-col">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="mb-8 w-full justify-between px-1 h-12 max-w-md ml-auto lg:hidden"
                size={"lg"}
              >
                <div className="flex items-center gap-1.5 ml-2">
                  <CiSearch />
                  <span className="text-[#a5a5a5] font-normal">
                    Cari bunga favoritmu...
                  </span>
                </div>
                <div className="bg-primary px-3 py-2 text-white rounded-md">
                  Cari
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side={"top"} className="overflow-y-auto h-full">
              <div className="max-w-md mx-auto">
                <SheetTitle>Cari Pilihan Terbaik</SheetTitle>
                <Separator className="mt-2 mb-4" />
                <FormProvider {...form}>
                  <ProductFilterForm onSubmit={onSubmitFilter} />
                </FormProvider>
              </div>
            </SheetContent>
          </Sheet>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col">
                  <div className="w-full aspect-square flex items-center justify-center bg-muted animate-pulse rounded-lg mb-4">
                    <MdOutlineImage
                      size={40}
                      className="text-muted-foreground"
                    />
                  </div>
                  <Skeleton className="h-4 w-[250px] mb-4" />
                  <Skeleton className="h-2 w-[200px]" />
                </div>
              ))
            ) : products?.data?.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 min-h-96 flex items-center justify-center">
                <span>Tidak ada produk ditemukan.</span>
              </div>
            ) : (
              products?.data?.map((product: Product) => (
                <CardProduct product={product} key={product.id} />
              ))
            )}
          </div>

          <Separator className="my-8" />
          {(products?.totalPages ?? 1) > 1 && (
            <Pagination
              page={products?.page || 1}
              setPage={handlePageChange}
              totalPages={products?.totalPages || 1}
              className="justify-center md:justify-start"
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default ProductsPage;
