import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { LoginFormSchema } from "@/features/auth/form/login";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";

type LoginFormProps = {
  onLogin: (data: LoginFormSchema) => void;
  loginLoading?: boolean;
};

const LoginForm = ({ onLogin, loginLoading }: LoginFormProps) => {
  const [showPassword] = useState(false);
  const { control, handleSubmit } = useFormContext<LoginFormSchema>();

  return (
    <form
      onSubmit={handleSubmit(onLogin)}
      className="flex flex-col gap-2 w-full max-w-sm md:max-w-72 lg:max-w-96 space-y-2"
    >
      {/* Form Field for Email */}
      <FormField
        control={control}
        name="email" // Use 'name' instead of 'email'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="Masukkan Email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Form Field for Password */}
      <FormField
        control={control}
        name="password" // Correctly binding to 'password' in LoginFormSchema
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan Password"
                  {...field}
                />
              </div>
            </FormControl>
            <FormMessage />
            <div className="mt-4 text-right">
              <Link
                href="/forgot-password"
                className="text-sm mb-10 text-primary hover:underline"
              >
                Lupa Password?
              </Link>
            </div>
          </FormItem>
        )}
      />

      {/* Submit Button */}
      <Button
        style={{ backgroundColor: "#EC9696" }}
        type="submit"
        className="my-4"
        disabled={loginLoading}
      >
        {loginLoading ? "Loading..." : "Masuk"}
      </Button>
    </form>
  );
};

export default LoginForm;
