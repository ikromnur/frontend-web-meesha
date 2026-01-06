"use client";

import { useFormContext } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateSearchParams } from "@/hooks/use-search-params";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UseFetchFilter } from "../api/use-fetch-filter";
import { useToast } from "@/hooks/use-toast";
import { FilterSchema } from "../form/filter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import React from "react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Availability } from "@/types/product";

const budget = [
  { label: "All", gte: 0, lte: undefined },
  { label: "< 100K", gte: 0, lte: 100000 },
  { label: "100K - 300K", gte: 100000, lte: 300000 },
  { label: "300K - 500K", gte: 300000, lte: 500000 },
  { label: "> 500K", gte: 500000, lte: undefined },
];

export const size = [
  { key: "S", name: "Small" },
  { key: "M", name: "Medium" },
  { key: "L", name: "Large" },
  { key: "XL", name: "Extra Large" },
];

export function ProductFilterForm({
  onSubmit,
  className,
  variant = "default",
}: {
  onSubmit: (values: FilterSchema) => void;
  className?: string;
  variant?: "default" | "floating";
}) {
  const { toast } = useToast();
  const { resetParams } = useUpdateSearchParams();

  const { data: filters, isLoading } = UseFetchFilter({
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useFormContext<FilterSchema>();

  const handleReset = () => {
    form.reset({
      search: "",
      categories: [],
      objectives: [],
      colors: [],
      size: [],
      availability: [],
      pageSize: 12,
      budget: { gte: 0, lte: undefined },
    });
    resetParams();
  };

  const allFilters = {
    ...filters,
    size: size,
  };

  const adminFilter = {
    ...(filters?.categories && { categories: filters.categories }),
    ...(size && { size }),
    availability: [
      { key: Availability.READY, name: "Ready di toko" },
      { key: Availability.PO_2_DAY, name: "Pre-Order 2 hari" },
      { key: Availability.PO_5_DAY, name: "PO 5 hari" },
    ],
  };

  if (isLoading || !filters || Object.keys(filters).length === 0) {
    return (
      <p className="text-center text-muted-foreground">Loading filters...</p>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("flex flex-col gap-4", className)}
      >
        {variant === "floating" ? (
          <React.Fragment>
            <div className="p-4 pb-0 flex items-center justify-between">
              <h4 className="font-medium">Filter Produk</h4>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
            <Accordion type="multiple" className="w-full px-4 -mt-3">
              {Object.entries(adminFilter).map(([key, options]) => (
                <React.Fragment key={key}>
                  <AccordionItem value={key}>
                    <AccordionTrigger>
                      {(() => {
                        const labelMap: Record<string, string> = {
                          categories: "Kategori",
                          size: "Ukuran Bouquet",
                          availability: "Ketersediaan",
                        };
                        return `Filter Berdasarkan ${
                          labelMap[key] ?? key
                        } Produk`;
                      })()}
                    </AccordionTrigger>
                    <AccordionContent>
                      <FormField
                        key={key}
                        control={form.control}
                        name={key as keyof FilterSchema}
                        render={({ field }) => {
                          const fieldValue = Array.isArray(field.value)
                            ? field.value
                            : [];

                          return (
                            <FormItem className="flex flex-col gap-2">
                              <div className="grid grid-cols-2 gap-x-2 gap-y-4">
                                {Array.isArray(options) &&
                                  options.map((option) => (
                                    <FormItem
                                      key={option.key}
                                      className="flex flex-row items-center space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          className="border-border"
                                          checked={fieldValue.includes(
                                            option.key
                                          )}
                                          onCheckedChange={(checked) => {
                                            const newValue =
                                              checked === true
                                                ? [...fieldValue, option.key]
                                                : fieldValue.filter(
                                                    (v) => v !== option.key
                                                  );

                                            field.onChange(newValue);
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {option.name}
                                      </FormLabel>
                                    </FormItem>
                                  ))}
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </React.Fragment>
              ))}
            </Accordion>
            <div className="px-4 pb-4">
              <Button className="w-full" type="submit">
                Terapkan Filter
              </Button>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div className="flex items-center gap-3">
              <FormField
                control={form.control}
                name="search"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="Cari mawar, wisuda, atau snack..."
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit">Cari</Button>
            </div>

            <h2 className="text-lg font-semibold text-foreground">Filter</h2>
            <Separator />
            {(() => {
              const labelMap: Record<string, string> = {
                categories: "Kategori",
                objectives: "Berdasarkan Acara",
                availability: "Ketersediaan",
              };

              const orderedFilters: Record<string, any[]> = {
                categories: filters.categories || [],
                objectives: filters.objectives || [],
                availability: [
                  { key: Availability.READY, name: "Ready di toko" },
                  { key: Availability.PO_2_DAY, name: "Pre-Order 2 hari" },
                  { key: Availability.PO_5_DAY, name: "PO 5 hari" },
                ],
              };

              const renderGroup = (key: keyof typeof orderedFilters) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key as keyof FilterSchema}
                  render={({ field }) => {
                    const fieldValue = Array.isArray(field.value)
                      ? field.value
                      : [];

                    const options = orderedFilters[key] || [];

                    return (
                      <FormItem className="flex flex-col gap-2">
                        <FormLabel className="capitalize">
                          {labelMap[key]}
                        </FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.isArray(options) &&
                            options.map((option) => (
                              <FormItem
                                key={option.key}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    className="border-border"
                                    checked={fieldValue.includes(option.key)}
                                    onCheckedChange={(checked) => {
                                      const newValue =
                                        checked === true
                                          ? [...fieldValue, option.key]
                                          : fieldValue.filter(
                                              (v) => v !== option.key
                                            );

                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.name}
                                </FormLabel>
                              </FormItem>
                            ))}
                        </div>
                        <Separator />
                      </FormItem>
                    );
                  }}
                />
              );

              return (
                <React.Fragment>
                  {renderGroup("categories")}
                  {renderGroup("objectives")}
                  {renderGroup("availability")}
                </React.Fragment>
              );
            })()}

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Rentang Harga</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(label) => {
                        const selected = budget.find((b) => b.label === label);
                        if (selected) {
                          field.onChange({
                            gte: selected.gte,
                            lte: selected.lte,
                          }); // simpan sebagai object
                        }
                      }}
                      value={
                        budget.find(
                          (option) =>
                            option.gte === field.value?.gte &&
                            option.lte === field.value?.lte
                        )?.label // cari label berdasarkan object yang tersimpan
                      }
                      className="flex flex-col space-y-1"
                    >
                      {budget.map((option) => (
                        <FormItem
                          key={option.label}
                          className="flex items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <RadioGroupItem value={option.label} />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {option.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  {/* Garis pemisah setelah bagian Rentang Harga */}
                  <Separator />
                </FormItem>
              )}
            />

            {(() => {
              const labelMap: Record<string, string> = {
                colors: "Nuansa Warna",
                size: "Ukuran Bouquet",
              };

              const orderedFilters: Record<string, any[]> = {
                colors: filters.colors || [],
                size: size,
              };

              const renderGroup = (key: keyof typeof orderedFilters) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key as keyof FilterSchema}
                  render={({ field }) => {
                    const fieldValue = Array.isArray(field.value)
                      ? field.value
                      : [];
                    const options = orderedFilters[key] || [];
                    return (
                      <FormItem className="flex flex-col gap-2">
                        <FormLabel className="capitalize">
                          {labelMap[key]}
                        </FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.isArray(options) &&
                            options.map((option) => (
                              <FormItem
                                key={option.key}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    className="border-border"
                                    checked={fieldValue.includes(option.key)}
                                    onCheckedChange={(checked) => {
                                      const newValue =
                                        checked === true
                                          ? [...fieldValue, option.key]
                                          : fieldValue.filter(
                                              (v) => v !== option.key
                                            );
                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.name}
                                </FormLabel>
                              </FormItem>
                            ))}
                        </div>
                        {/* Tampilkan garis pemisah kecuali pada bagian Ukuran Bouquet */}
                        {key !== "size" && <Separator />}
                      </FormItem>
                    );
                  }}
                />
              );

              return (
                <React.Fragment>
                  {renderGroup("colors")}
                  {renderGroup("size")}
                </React.Fragment>
              );
            })()}

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button type="submit" className="w-full">
                Apply
              </Button>
            </div>
          </React.Fragment>
        )}
      </form>
    </Form>
  );
}
