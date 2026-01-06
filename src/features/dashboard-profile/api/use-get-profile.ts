import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";

export type ProfileData = {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  photo_profile: string | null;
  role: string;
};

export const UseGetProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/profile");
      return data.data as ProfileData;
    },
  });
};
