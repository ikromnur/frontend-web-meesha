import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import { useSession } from "next-auth/react";

export type ProfileData = {
  id: string;
  username: string | null;
  name: string;
  email: string;
  phone: string | null;
  photo_profile: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export const useGetProfile = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      try {
        const { data } = await axiosInstance.get("/profile");
        return data.data as ProfileData;
      } catch (error) {
        console.error("[useGetProfile] Error fetching profile:", error);

        // Fallback to session data if API fails
        if (session?.user) {
          console.log("[useGetProfile] Using session data as fallback");
          return {
            id: "", // ID not available in session
            username: session.user.username || null,
            name: session.user.name || "",
            email: session.user.email || "",
            phone: session.user.phone || null,
            photo_profile: session.user.image || null,
            role: session.user.role || "user",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as ProfileData;
        }

        throw error;
      }
    },
    retry: 1,
    enabled: !!session,
  });
};
