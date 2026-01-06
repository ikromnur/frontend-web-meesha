"use client";

import { ImageIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import { ProfileFormData } from "../form/profile";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";

type ProfileFormProps = {
  onSubmit: (data: ProfileFormData) => void;
  existingPhoto?: string | null;
  isLoading?: boolean;
  onPhotoUpload?: (file: File) => void;
  onPhotoDelete?: () => void;
};

const ProfileForm = ({
  onSubmit,
  existingPhoto,
  isLoading = false,
  onPhotoUpload,
  onPhotoDelete,
}: ProfileFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, setValue } = useFormContext<ProfileFormData>();

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  // Set existing photo on mount
  useEffect(() => {
    if (existingPhoto && !profileImage) {
      const photoUrl = existingPhoto.startsWith("http")
        ? existingPhoto
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}${existingPhoto}`;
      setProfileImage(photoUrl);
    }
  }, [existingPhoto, profileImage]);

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validasi tipe & ukuran (max 2MB)
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!allowedTypes.includes(file.type)) {
        toast.error("Tipe file tidak valid. Hanya JPEG/PNG yang diizinkan.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size > maxSize) {
        toast.error("Ukuran file melebihi 2MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const imageURL = URL.createObjectURL(file);
      setProfileImage(imageURL);
      setValue("photo_profile", file);
      setIsDeleted(false);
      // Trigger upload langsung tanpa butuh tombol submit
      if (onPhotoUpload) onPhotoUpload(file);
    }
  };

  const handleDeleteImage = () => {
    setProfileImage(null);
    setValue("photo_profile", null);
    setIsDeleted(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onPhotoDelete) onPhotoDelete();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="relative w-full max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="font-medium text-2xl mb-8">Profile Picture</h1>

        <div className="flex md:flex-row gap-10 mb-8 items-center">
          {/* Profile Image */}
          <div className="w-40 h-40 rounded-full bg-gray-100 shadow-sm overflow-hidden flex items-center justify-center text-gray-400 text-4xl border-2 border-gray-200">
            {profileImage && !isDeleted ? (
              <Image
                width={160}
                height={160}
                src={profileImage}
                alt="Profile"
                className="object-cover w-full h-full"
              />
            ) : (
              <ImageIcon size={40} />
            )}
          </div>

          <div className="flex items-center gap-4 flex-col md:flex-row justify-center md:justify-start">
            <Button
              type="button"
              size="lg"
              onClick={handleOpenFileDialog}
              disabled={isLoading}
            >
            {profileImage && !isDeleted ? "Ganti Foto" : "Unggah Foto"}
            </Button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            {(profileImage || existingPhoto) && !isDeleted && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleDeleteImage}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 w-4 h-4" />
            Hapus Foto
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nomor HP</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" size="lg" className="mt-4" disabled={isLoading}>
            {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ProfileForm;
