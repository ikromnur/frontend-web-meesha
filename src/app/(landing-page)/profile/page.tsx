"use client";

import ProfileFormWrapper from "@/features/profile/components/profile-form-wrapper";

export default function UserProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Profile Saya</h1>
          <p className="text-gray-600 mt-2">
            Kelola informasi profile Anda
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <ProfileFormWrapper />
        </div>
      </div>
    </div>
  );
}
