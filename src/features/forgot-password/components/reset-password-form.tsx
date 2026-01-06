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
import { ResetPasswordSchema } from "@/schemas/forgot-password";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";

type ResetPasswordFormProps = {
  onSubmit: (data: ResetPasswordSchema) => void;
  isLoading?: boolean;
};

const ResetPasswordForm = ({ onSubmit, isLoading }: ResetPasswordFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit } = useFormContext<ResetPasswordSchema>();

  const handleShowPassword = () => setShowPassword((prev) => !prev);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-2 w-full space-y-2"
    >
      {/* Form Field for Email (Hidden) */}
      <FormField
        control={control}
        name="email"
        render={({ field }) => <input type="hidden" {...field} />}
      />

      {/* OTP dihapus: verifikasi dilakukan di halaman OTP */}

      {/* Form Field for New Password */}
      <FormField
        control={control}
        name="newPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password Baru</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan Password Baru"
                  disabled={isLoading}
                  {...field}
                />
                <Button
                  type="button"
                  tabIndex={-1}
                  variant="ghost"
                  onClick={handleShowPassword}
                  size="icon"
                  className="absolute top-4 right-1 -translate-y-1/2 hover:bg-transparent"
                  aria-label={
                    showPassword ? "Sembunyikan Password" : "Tampilkan Password"
                  }
                >
                  {showPassword ? (
                    <FaRegEye className="text-secondary-foreground" />
                  ) : (
                    <FaRegEyeSlash className="text-secondary-foreground" />
                  )}
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Form Field for Confirm Password */}
      <FormField
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Konfirmasi Password Baru</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Konfirmasi Password Baru"
                  disabled={isLoading}
                  {...field}
                />
                <Button
                  type="button"
                  tabIndex={-1}
                  variant="ghost"
                  onClick={handleShowPassword}
                  size="icon"
                  className="absolute top-4 right-1 -translate-y-1/2 hover:bg-transparent"
                  aria-label={
                    showPassword ? "Sembunyikan Password" : "Tampilkan Password"
                  }
                >
                  {showPassword ? (
                    <FaRegEye className="text-secondary-foreground" />
                  ) : (
                    <FaRegEyeSlash className="text-secondary-foreground" />
                  )}
                </Button>
              </div>
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
        {isLoading ? "Memproses..." : "Reset Password"}
      </Button>
    </form>
  );
};

export default ResetPasswordForm;
