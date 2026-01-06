import { axiosInstance } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

// Define the type for a single message
export type DashboardMessage = {
  id: string;
  sender: string;
  initials: string;
  avatarUrl?: string;
  title: string;
  content: string;
  date: string;
  read: boolean;
};

interface UseFetchMessagesProps {
  onError?: (e: Error) => void;
}

export const UseFetchMessages = ({ onError }: UseFetchMessagesProps = {}) => {
  return useQuery<DashboardMessage[]>({ // Specify the return type for useQuery
    queryKey: ["messages"],
    queryFn: async () => {
      try {
        // Use normalized path; interceptor will prefix '/api' when needed
        const { data } = await axiosInstance.get("/messages");
        return data.data;
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
        console.error("Failed to fetch messages:", error);
        throw error;
      }
    },
  });
};
