import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

interface UseFetchFilterProps {
  onError: (e: Error) => void;
}

export const UseFetchFilter = ({ onError }: UseFetchFilterProps) => {
  return useQuery({
    queryKey: ["productMeta"],
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get("/products/meta");
        return data;
      } catch (error) {
        onError(error as Error);
        console.error(error);
        throw error;
      }
    },
  });
};
