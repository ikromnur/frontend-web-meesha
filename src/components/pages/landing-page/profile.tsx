"use client";

import UnauthorizePage from "../unauthorize";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileSchema,
  ProfileFormData,
} from "@/features/profile/form/profile";
import ProfileForm from "@/features/profile/components/profile-form";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useGetProfile } from "@/features/profile/api/use-get-profile";
import { useUpdateProfile } from "@/features/profile/api/use-update-profile";
import { useUploadPhoto } from "@/features/profile/api/use-upload-photo";
import { useDeletePhoto } from "@/features/profile/api/use-delete-photo";
import { useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { axiosInstance } from "@/lib/axios";

const ProfilePage = () => {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile data
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useGetProfile();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      phone: "",
      photo_profile: null,
    },
  });

  // Update form when profile data is loaded
  useEffect(() => {
    if (profileData) {
      form.reset({
        username: profileData.username || "",
        name: profileData.name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        photo_profile: null,
      });
    }
  }, [profileData, form]);

  // Update profile mutation
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile({
    onSuccess: async () => {
      toast({
        title: "Berhasil",
        description: "Profile berhasil diperbarui",
      });

      // Invalidate and refetch profile data
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });

      // Update session
      await updateSession();

      // Reload page to update all session data
      window.location.reload();
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error("Update profile error:", axiosError);

      let errorMessage = "Gagal memperbarui profile. Silakan coba lagi.";

      if (axiosError.response?.status === 503) {
        errorMessage =
          "Backend server tidak berjalan. Mohon hubungi administrator.";
      } else if (axiosError.response?.status === 404) {
        errorMessage =
          "Endpoint profile tidak ditemukan. Mohon hubungi administrator.";
      } else if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      }

      toast({
        title: "Gagal",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const { mutate: uploadPhoto, isPending: isUploading } = useUploadPhoto({
    onSuccess: async () => {
      toast({ title: "Berhasil", description: "Foto profile diunggah" });
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      try {
        const { data } = await axiosInstance.get("/profile");
        const p = data.data as { photo_profile?: string | null; name?: string; username?: string; phone?: string };
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
        const photo = p.photo_profile;
        const normalizedPhoto = photo
          ? /^https?:\/\//.test(photo)
            ? photo
            : `${backendUrl}${photo.startsWith("/") ? "" : "/"}${photo}`
          : null;
        await updateSession({
          user: {
            image: normalizedPhoto,
            name: p.name ?? null,
            username: p.username ?? null,
            phone: p.phone ?? null,
          },
        } as any);
      } catch {}
      window.location.reload();
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || "Gagal mengunggah foto";
      toast({ title: "Gagal", description: errorMessage, variant: "destructive" });
    },
  });

  const { mutate: deletePhoto, isPending: isDeleting } = useDeletePhoto({
    onSuccess: async () => {
      toast({ title: "Berhasil", description: "Foto profile dihapus" });
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      try {
        const { data } = await axiosInstance.get("/profile");
        const p = data.data as { photo_profile?: string | null; name?: string; username?: string; phone?: string };
        await updateSession({
          user: {
            image: null,
            name: p.name ?? null,
            username: p.username ?? null,
            phone: p.phone ?? null,
          },
        } as any);
      } catch {}
      window.location.reload();
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || "Gagal menghapus foto";
      toast({ title: "Gagal", description: errorMessage, variant: "destructive" });
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    // Hanya update field teks; upload foto via handler khusus
    updateProfile({
      username: data.username,
      name: data.name,
      email: data.email,
      phone: data.phone,
    });
  };

  const handlePhotoUpload = (file: File) => uploadPhoto(file);
  const handlePhotoDelete = () => deletePhoto();

  if (!session) {
    return <UnauthorizePage />;
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat profile...</p>
        </div>
      </div>
    );
  }

  // Show error alert if backend not available but still show form with session data
  const showBackendError = profileError && !profileData;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {showBackendError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Backend Tidak Tersedia</AlertTitle>
            <AlertDescription>
              Koneksi ke backend gagal. Anda masih bisa melihat data dari
              session, tetapi update profile mungkin tidak berfungsi sampai
              backend aktif kembali.
            </AlertDescription>
          </Alert>
        )}

        <FormProvider {...form}>
          <ProfileForm
            onSubmit={onSubmit}
            existingPhoto={profileData?.photo_profile}
            isLoading={isUpdating || isUploading || isDeleting}
            onPhotoUpload={handlePhotoUpload}
            onPhotoDelete={handlePhotoDelete}
          />
        </FormProvider>
      </div>
    </div>
  );
};

export default ProfilePage;
