import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { RegisterFormSchema } from "@/features/auth/form/register";

type UsePostRegisterProps = {
  onSuccess: () => void;
  onError: (e: unknown) => void;
};

export const UsePostRegister = ({
  onSuccess,
  onError,
}: UsePostRegisterProps) => {
  return useMutation({
    mutationFn: async (form: RegisterFormSchema) => {
      // Gunakan endpoint API Next.js lokal (/api/auth/register)
      // Kita gunakan axios standar (bukan axiosInstance) untuk menghindari
      // interceptor yang memanipulasi baseURL menjadi double /api/api
      const { data } = await axios.post("/api/auth/register", form);
      return data.data;
    },
    onSuccess,
    onError,
  });
};
