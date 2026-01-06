"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { RequestOtpSchema } from "@/schemas/forgot-password";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type RequestOtpFormProps = {
  onSubmit: (data: RequestOtpSchema) => void;
  isLoading?: boolean;
};

const RequestOtpForm = ({ onSubmit, isLoading }: RequestOtpFormProps) => {
  const { control, handleSubmit } = useFormContext<RequestOtpSchema>();

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 w-full"
    >
      {/* Form Field for Email */}
      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="Masukkan Email"
                disabled={isLoading}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Submit Button */}
      <Button
        style={{ backgroundColor: "#EC9696" }}
        type="submit"
        className="my-4"
        disabled={isLoading}
      >
        {isLoading ? "Mengirim..." : "Kirim Kode OTP"}
      </Button>

      {/* Back to Login Link */}
      <div className="text-center mt-2">
        <Link
          href="/login"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Login
        </Link>
      </div>
    </form>
  );
};

export default RequestOtpForm;
