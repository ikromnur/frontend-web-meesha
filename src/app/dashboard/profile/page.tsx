"use client";

import ProfileFormWrapper from "@/features/profile/components/profile-form-wrapper";

export default function DashboardProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile Saya</h1>
        <p className="text-gray-600">
          Kelola informasi profile Anda untuk mengontrol, melindungi dan
          mengamankan akun
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <ProfileFormWrapper />
      </div>
    </div>
  );
}
