"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import {
  UseFetchMessages,
  type DashboardMessage,
} from "@/features/messages/api/use-fetch-messages";
import { useReplyMessage } from "@/features/messages/api/use-reply-message";
import { useToast } from "@/hooks/use-toast";

const MessagesPage = () => {
  const [selectedMessage, setSelectedMessage] =
    useState<DashboardMessage | null>(null);
  const [filter, setFilter] = useState<
    "Semua" | "Belum Dibaca" | "Sudah Dibaca"
  >("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");

  const { data: messages, isLoading, isError } = UseFetchMessages();
  const { toast } = useToast();
  const replyMutation = useReplyMessage({
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Balasan berhasil dikirim" });
      setReplyText("");
      // Tandai sebagai dibaca setelah membalas
      if (selectedMessage) {
        setSelectedMessage({ ...selectedMessage, read: true });
      }
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan mengirim balasan",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!selectedMessage && messages && messages.length > 0) {
      setSelectedMessage(messages[0]);
    }
  }, [messages, selectedMessage]);

  const filteredMessages = messages?.filter((message) => {
    if (filter === "Belum Dibaca") return !message.read;
    if (filter === "Sudah Dibaca") return message.read;
    return true;
  });

  const searchedMessages = filteredMessages?.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      m.sender.toLowerCase().includes(q) ||
      m.title.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q)
    );
  });

  const handleSelectMessage = (message: DashboardMessage) => {
    setSelectedMessage({ ...message, read: true });
  };

  const handleSendReply = () => {
    if (!selectedMessage || !replyText.trim()) return;
    replyMutation.mutate({
      messageId: selectedMessage.id,
      replyText: replyText.trim(),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Kolom Sidebar Kiri */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Pesan</CardTitle>
          <p className="text-sm text-gray-500">Kelola pesan toko bunga anda</p>
        </CardHeader>
        <CardContent className="flex flex-col flex-grow">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">KOTAK MASUK</h3>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari Pesan"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            {(["Semua", "Belum Dibaca", "Sudah Dibaca"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="rounded-full"
              >
                {f}
              </Button>
            ))}
          </div>
          <Separator className="mb-4" />
          <div className="flex-grow overflow-y-auto -mr-6 pr-4">
            <div className="flex flex-col gap-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-grow space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : isError ? (
                <p className="text-red-500 text-center">Gagal memuat pesan.</p>
              ) : (
                searchedMessages?.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleSelectMessage(message)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer hover:bg-gray-50",
                      selectedMessage?.id === message.id && "bg-gray-100"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={message.avatarUrl}
                          alt={message.sender}
                        />
                        <AvatarFallback>{message.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow overflow-hidden">
                        <p className="font-semibold text-sm">
                          {message.sender}
                        </p>
                        <p className="font-medium text-sm truncate">
                          {message.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {message.content}
                        </p>
                      </div>
                      {!message.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kolom Konten Utama Kanan */}
      <Card className="lg:col-span-2 flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Separator />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500">Gagal memuat pesan.</p>
          </div>
        ) : selectedMessage ? (
          <>
            <CardHeader className="border-b">
              <h2 className="text-xl font-bold">{selectedMessage.title}</h2>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={selectedMessage.avatarUrl || "/avatar.png"}
                      alt={selectedMessage.sender}
                    />
                    <AvatarFallback>{selectedMessage.initials}</AvatarFallback>
                  </Avatar>
                  <p>
                    dari{" "}
                    <span className="font-medium text-gray-700">
                      {selectedMessage.sender}
                    </span>
                  </p>
                </div>
                <p>{selectedMessage.date}</p>
              </div>
            </CardHeader>
            <CardContent className="flex-grow p-6 overflow-y-auto">
              <p className="text-base leading-relaxed">
                {selectedMessage.content}
              </p>
            </CardContent>
            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <Textarea
                placeholder="Tulis balasan Anda disini..."
                className="mb-4 h-32 bg-white"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={!selectedMessage}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSendReply}
                  disabled={
                    !selectedMessage ||
                    !replyText.trim() ||
                    replyMutation.isPending
                  }
                >
                  {replyMutation.isPending ? "Mengirim..." : "Kirim Balasan"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Pilih pesan untuk ditampilkan</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MessagesPage;
