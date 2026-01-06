import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import axios from "@/lib/axios";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RatingDialogProps {
  productId: string;
  orderId: string;
  productName: string;
  existingRating?: {
    rating: number;
    comment: string | null;
    reply?: string | null;
  } | null;
  trigger?: React.ReactNode;
}

export const RatingDialog: React.FC<RatingDialogProps> = ({
  productId,
  orderId,
  productName,
  existingRating,
  trigger,
}) => {
  const [rating, setRating] = useState(existingRating?.rating || 5);
  const [comment, setComment] = useState(existingRating?.comment || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      // Menggunakan endpoint /ratings yang akan diteruskan ke backend Express
      await axios.post("/ratings", {
        productId,
        orderId,
        rating,
        comment,
      });

      toast({
        title: "Berhasil",
        description: "Ulasan Anda telah disimpan.",
      });

      // Refresh data pesanan dan ulasan
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["product-ratings", productId],
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to submit rating:", error);
      toast({
        title: "Gagal",
        description:
          error.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan ulasan.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Beri Ulasan</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ulasan Produk: {productName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-8 w-8 ${!existingRating ? "cursor-pointer" : ""} ${
                  star <= rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
                onClick={() => !existingRating && setRating(star)}
              />
            ))}
          </div>
          <Textarea
            placeholder="Tulis ulasan Anda di sini..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={!!existingRating}
          />
          {existingRating?.reply && (
            <div className="bg-gray-50 p-3 rounded-md border border-gray-100 mt-2">
              <p className="text-sm font-semibold text-blue-600 mb-1">
                Balasan Admin:
              </p>
              <p className="text-sm text-gray-700">{existingRating.reply}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            {existingRating ? "Tutup" : "Batal"}
          </Button>
          {!existingRating && (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Ulasan"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
