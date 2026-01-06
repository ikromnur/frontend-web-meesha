import React, { useState } from "react";
import { Star, User, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductRatingItem } from "../api/use-fetch-ratings";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ProductReviewsProps {
  productId: string;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
}) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const limit = 5;
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyTarget, setReplyTarget] = useState<ProductRatingItem | null>(
    null
  );

  const { data, isLoading } = useQuery({
    queryKey: ["product-ratings", productId, page],
    queryFn: async () => {
      const response = await axios.get("/ratings", {
        params: { productId, page, limit },
      });
      return response.data;
    },
  });

  // Handle various response structures
  const rawData = data?.data || data || [];
  const reviews: ProductRatingItem[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.items)
    ? rawData.items
    : [];

  const pagination = data?.meta || data?.pagination || {};
  const totalPages = pagination.totalPages || 1;

  const isAdmin =
    String((session as any)?.user?.role || "").toUpperCase() === "ADMIN";

  const openReplyDialog = (review: ProductRatingItem) => {
    setReplyTarget(review);
    setReplyText(review.reply || "");
    setReplyOpen(true);
  };

  const submitReply = async () => {
    if (!replyTarget) return;
    try {
      await axios.post(`/ratings/${replyTarget.id}/reply`, {
        reply: replyText,
      });
      toast({ title: "Berhasil", description: "Balasan admin tersimpan." });
      // Tutup dialog dan refresh ulasan
      setReplyOpen(false);
      setReplyTarget(null);
      setReplyText("");
      setPage((p) => p);
    } catch (err: any) {
      toast({
        title: "Gagal",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Tidak dapat menyimpan balasan.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Belum ada ulasan untuk produk ini.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Ulasan Pelanggan</h3>

        <div className="grid gap-6">
          {reviews.map((review: ProductRatingItem) => (
            <div key={review.id} className="border-b pb-6 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={review.user?.image || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {review.userName || review.user?.name || "Pengguna"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {review.createdAt &&
                        format(new Date(review.createdAt), "d MMMM yyyy", {
                          locale: id,
                        })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReplyDialog(review)}
                    >
                      {review.reply ? "Edit Balasan" : "Balas Ulasan"}
                    </Button>
                  )}
                </div>
              </div>

              {review.comment && (
                <p className="text-gray-700 mt-2 text-sm">{review.comment}</p>
              )}

              {review.reply && (
                <div className="mt-3 ml-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-600">
                      Respon Admin
                    </span>
                    {review.replyAt && (
                      <span className="text-xs text-gray-400">
                        •{" "}
                        {format(new Date(review.replyAt), "d MMM yyyy", {
                          locale: id,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{review.reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <div className="flex items-center px-4 text-sm">
              Halaman {page} dari {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Selanjutnya
            </Button>
          </div>
        )}
      </div>

      {/* Dialog Balasan Admin */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {replyTarget?.userName
                ? `Balas Ulasan: ${replyTarget.userName}`
                : "Balas Ulasan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="Tulis balasan admin di sini..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setReplyOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitReply}>Simpan Balasan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
