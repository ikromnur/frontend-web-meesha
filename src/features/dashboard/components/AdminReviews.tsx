import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Star, MessageCircle, User } from "lucide-react";

// Tipe data yang diharapkan dari endpoint admin
interface AdminRatingItem {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  replyAt: string | null;
  createdAt: string;
  // Backend returns flattened fields
  userName: string;
  userEmail?: string;
  productName: string;
  productImage?: string;
  orderId: string;
}

export const AdminReviews = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<AdminRatingItem | null>(
    null
  );
  const [replyText, setReplyText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch semua ulasan dari endpoint admin
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-ratings"],
    queryFn: async () => {
      const response = await axios.get("/ratings/admin/all");
      // Handle response structure variations
      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    },
  });

  // Mutation untuk mengirim balasan
  const replyMutation = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      await axios.post(`/ratings/${id}/reply`, { reply });
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Balasan ulasan berhasil dikirim.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-ratings"] });
      setReplyDialogOpen(false);
      setReplyText("");
      setSelectedReview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.response?.data?.message || "Gagal mengirim balasan.",
        variant: "destructive",
      });
    },
  });

  const handleOpenReply = (review: AdminRatingItem) => {
    setSelectedReview(review);
    setReplyText(review.reply || ""); // Pre-fill jika edit (opsional)
    setReplyDialogOpen(true);
  };

  const handleSubmitReply = () => {
    if (!selectedReview) return;
    if (!replyText.trim()) {
      toast({
        title: "Peringatan",
        description: "Balasan tidak boleh kosong.",
        variant: "destructive",
      });
      return;
    }
    replyMutation.mutate({ id: selectedReview.id, reply: replyText });
  };

  // Filter logic
  const filteredReviews = reviews.filter((review: AdminRatingItem) => {
    if (activeTab === "need_reply") {
      return !review.reply;
    }
    if (activeTab === "replied") {
      return !!review.reply;
    }
    return true;
  });

  if (isLoading) {
    return <div className="p-8 text-center">Memuat ulasan...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Ulasan Pelanggan</h2>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Semua ({reviews.length})</TabsTrigger>
          <TabsTrigger value="need_reply">
            Perlu Dibalas ({reviews.filter((r: any) => !r.reply).length})
          </TabsTrigger>
          <TabsTrigger value="replied">
            Sudah Dibalas ({reviews.filter((r: any) => !!r.reply).length})
          </TabsTrigger>
        </TabsList>

        <div className="rounded-md border mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Rating & Ulasan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Tidak ada ulasan ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review: AdminRatingItem) => (
                  <TableRow key={review.id}>
                    <TableCell className="max-w-[200px]">
                      <div className="flex items-center gap-3">
                        {review.productImage && (
                          <img
                            src={review.productImage}
                            alt={review.productName}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        )}
                        <span className="font-medium text-sm line-clamp-2">
                          {review.productName || "Produk Tidak Dikenal"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {/* Admin usually doesn't need avatar if not provided, using fallback */}
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {review.userName || "User"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {review.userEmail || ""}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="space-y-1">
                        <div className="flex text-yellow-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? "fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {review.comment || "-"}
                        </p>
                        {review.reply && (
                          <div className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground">
                            <span className="font-bold flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" /> Balasan
                              Admin:
                            </span>
                            {review.reply}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={review.reply ? "default" : "secondary"}
                        className={
                          review.reply
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        }
                      >
                        {review.reply ? "Sudah Dibalas" : "Perlu Dibalas"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReply(review)}
                      >
                        {review.reply ? "Edit Balasan" : "Balas"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Tabs>

      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Balas Ulasan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Ulasan Pengguna</h4>
              <div className="rounded-md bg-muted p-3 text-sm">
                &quot;{selectedReview?.comment || "Tidak ada komentar tertulis"}&quot;
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="reply" className="text-sm font-medium">
                Balasan Anda
              </label>
              <Textarea
                id="reply"
                placeholder="Tulis balasan terima kasih atau tanggapan..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplyDialogOpen(false)}
              disabled={replyMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmitReply}
              disabled={replyMutation.isPending}
            >
              {replyMutation.isPending ? "Mengirim..." : "Kirim Balasan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
