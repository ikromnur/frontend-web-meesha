"use client";

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/lib/axios";
import ProfileForm from "./profile-form";
import { profileSchema, ProfileFormData } from "../form/profile";
import {
  useGetProfile,
  useUpdateProfile,
  useDeletePhoto,
} from "../api";
import { useUploadPhoto } from "../api/use-upload-photo";
import { Loader2 } from "lucide-react";

export default function ProfileFormWrapper() {
  const { data: profile, isLoading: isLoadingProfile } = useGetProfile();
  const { update: updateSession } = useSession();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      phone: "",
    },
  });

  // Update form when profile data is loaded
  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username || "",
        name: profile.name,
        email: profile.email,
        phone: profile.phone || "",
      });
    }
  }, [profile, form]);

  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile({
    onSuccess: async () => {
      toast.success("Profile berhasil diperbarui!");
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      try {
        const { data } = await axiosInstance.get("/profile");
        const p = data.data;
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
        const photo = p.photo_profile as string | null | undefined;
        const normalizedPhoto = photo
          ? /^https?:\/\//.test(photo)
            ? photo
            : `${backendUrl}${photo.startsWith("/") ? "" : "/"}${photo}`
          : null;
        await updateSession({
          user: {
            name: p.name,
            image: normalizedPhoto,
            username: p.username ?? null,
            phone: p.phone ?? null,
          },
        } as any);
      } catch {}
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message || "Gagal memperbarui profile";
      toast.error(message);
    },
  });

  const { mutate: uploadPhoto, isPending: isUploading } = useUploadPhoto({
    onSuccess: async () => {
      toast.success("Foto profile berhasil diunggah!");
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      try {
        const { data } = await axiosInstance.get("/profile");
        const p = data.data;
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
        const photo = p.photo_profile as string | null | undefined;
        const normalizedPhoto = photo
          ? /^https?:\/\//.test(photo)
            ? photo
            : `${backendUrl}${photo.startsWith("/") ? "" : "/"}${photo}`
          : null;
        await updateSession({
          user: {
            name: p.name,
            image: normalizedPhoto,
            username: p.username ?? null,
            phone: p.phone ?? null,
          },
        } as any);
      } catch {}
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message || "Gagal mengunggah foto";
      toast.error(message);
    },
  });

  const { mutate: deletePhoto, isPending: isDeleting } = useDeletePhoto({
    onSuccess: async () => {
      toast.success("Foto profile berhasil dihapus!");
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      try {
        const { data } = await axiosInstance.get("/profile");
        const p = data.data;
        await updateSession({
          user: {
            name: p.name,
            image: null,
            username: p.username ?? null,
            phone: p.phone ?? null,
          },
        } as any);
      } catch {}
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message || "Gagal menghapus foto";
      toast.error(message);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    // Update hanya field teks; upload foto ditangani oleh endpoint khusus
    const profileData = {
      username: data.username || undefined,
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
    };
    // Jika tidak ada perubahan data teks dan tidak ada file foto, jangan kirim request
    const noTextChange =
      (profile?.username || "") === (data.username || "") &&
      profile?.name === data.name &&
      profile?.email === data.email &&
      (profile?.phone || "") === (data.phone || "");
    if (noTextChange) {
      toast.info("Tidak ada perubahan untuk disimpan");
      return;
    }

    updateProfile(profileData);
  };

  const handlePhotoUpload = (file: File) => {
    // Upload langsung ke endpoint khusus foto profil
    uploadPhoto(file);
  };

  const handlePhotoDelete = () => {
    deletePhoto();
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <ProfileForm
        onSubmit={onSubmit}
        onPhotoUpload={handlePhotoUpload}
        onPhotoDelete={handlePhotoDelete}
        existingPhoto={profile?.photo_profile}
        isLoading={isUpdating || isDeleting || isUploading}
      />
    </FormProvider>
  );
}
