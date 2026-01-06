// Shared OTP storage untuk request-otp dan reset-password routes
// Dalam production, ganti ini dengan database (Redis, PostgreSQL, etc.)

export interface OTPData {
  otp: string;
  expiresAt: number;
}

// In-memory storage untuk development
// CATATAN: Ini akan hilang ketika server restart
// Untuk production, gunakan Redis atau database
class OTPStorage {
  private storage: Map<string, OTPData>;

  constructor() {
    this.storage = new Map();
  }

  // Set OTP untuk email tertentu
  set(email: string, otp: string, expiresInMs: number = 300000): void {
    const expiresAt = Date.now() + expiresInMs;
    this.storage.set(email, { otp, expiresAt });
  }

  // Get OTP data untuk email tertentu
  get(email: string): OTPData | undefined {
    const data = this.storage.get(email);

    // Auto-cleanup jika sudah expired
    if (data && Date.now() > data.expiresAt) {
      this.storage.delete(email);
      return undefined;
    }

    return data;
  }

  // Verify OTP
  verify(email: string, otp: string): boolean {
    const data = this.get(email);

    if (!data) {
      return false;
    }

    return data.otp === otp;
  }

  // Delete OTP untuk email tertentu
  delete(email: string): boolean {
    return this.storage.delete(email);
  }

  // Check apakah OTP sudah expired
  isExpired(email: string): boolean {
    const data = this.storage.get(email);

    if (!data) {
      return true;
    }

    return Date.now() > data.expiresAt;
  }

  // Get remaining time in seconds
  getRemainingTime(email: string): number {
    const data = this.storage.get(email);

    if (!data) {
      return 0;
    }

    const remaining = Math.max(0, data.expiresAt - Date.now());
    return Math.floor(remaining / 1000);
  }

  // Cleanup semua expired OTPs
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [email, data] of this.storage.entries()) {
      if (data.expiresAt < now) {
        this.storage.delete(email);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // Get storage size
  size(): number {
    return this.storage.size;
  }

  // Clear all OTPs (untuk testing)
  clear(): void {
    this.storage.clear();
  }
}

// Singleton instance
export const otpStorage = new OTPStorage();

// Mock database users untuk development
// Dalam production, ini harus diganti dengan query ke database
export const mockUsers = new Map<string, { password: string; name: string }>([
  [
    "user@example.com",
    { password: "hashedPassword123", name: "User Example" },
  ],
  ["test@meesha.co", { password: "hashedPassword456", name: "Test User" }],
  ["admin@meesha.co", { password: "hashedPassword789", name: "Admin Meesha" }],
]);

// Helper function untuk check apakah email terdaftar
export function isEmailRegistered(email: string): boolean {
  return mockUsers.has(email);
}

// Helper function untuk update password
export function updateUserPassword(email: string, newPassword: string): boolean {
  const user = mockUsers.get(email);

  if (!user) {
    return false;
  }

  // Dalam production, hash password dengan bcrypt
  // Example:
  // const hashedPassword = await bcrypt.hash(newPassword, 10);
  mockUsers.set(email, { ...user, password: `hashed_${newPassword}` });

  return true;
}
