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
import { DashboardProfileFormValues } from "../schemas/profile-schema";
import { useRef, useState, useEffect } from "react";

type DashboardProfileFormProps = {
  onSubmit: (data: DashboardProfileFormValues) => void;
  isLoading?: boolean;
  initialImage?: string | null;
};

const DashboardProfileForm = ({
  onSubmit,
  isLoading = false,
  initialImage = null,
}: DashboardProfileFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { control, handleSubmit, setValue } =
    useFormContext<DashboardProfileFormValues>();

  const [profileImage, setProfileImage] = useState<string | null>(initialImage);

  useEffect(() => {
    if (initialImage) {
      setProfileImage(initialImage);
    }
  }, [initialImage]);

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setProfileImage(imageURL);
      setValue("photo_profile", file);
    }
  };

  const handleDeleteImage = () => {
    setProfileImage(null);
    setValue("photo_profile", null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Profile Picture Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Foto Profile</h2>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* Profile Image */}
          <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-gray-400">
            {profileImage ? (
              <Image
                width={128}
                height={128}
                src={profileImage}
                alt="Profile"
                className="object-cover w-full h-full"
              />
            ) : (
              <ImageIcon size={48} />
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="default"
              onClick={handleOpenFileDialog}
              variant="outline"
            >
              Ubah Foto
            </Button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={handleDeleteImage}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-2 w-4 h-4" />
              Hapus Foto
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Format gambar yang diizinkan: JPG, JPEG, PNG. Ukuran maksimal 2MB.
        </p>
      </div>

      {/* Personal Information Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Informasi Personal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Masukkan username" />
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
                  <Input {...field} placeholder="Masukkan nama lengkap" />
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
                  <Input
                    type="email"
                    {...field}
                    placeholder="Masukkan email"
                  />
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
                  <Input {...field} placeholder="+628123456789" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => window.location.reload()}
        >
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
};

export default DashboardProfileForm;
