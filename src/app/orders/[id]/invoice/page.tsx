"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InvoicePage({ params }: { params: { id: string } }) {
  const rawId = params.id;
  const [orderId, setOrderId] = useState<string>(rawId);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const triedAliasRef = useRef<boolean>(false);

  // Resolve orderId backend jika param adalah merchant_ref lama (INV-...)
  useEffect(() => {
    const looksLikeMerchantRef = String(rawId || "").startsWith("INV-");
    if (!looksLikeMerchantRef) {
      setOrderId(rawId);
      return;
    }
    try {
      const saved = sessionStorage.getItem("checkout:orderId");
      if (saved) {
        let actualId = saved;
        if (/^\s*".*"\s*$/.test(saved)) {
          const parsed = JSON.parse(saved);
          actualId = typeof parsed === "string" ? parsed : String(parsed);
        }
        if (actualId && actualId !== "null" && actualId !== "undefined") {
          setOrderId(actualId);
          return;
        }
      }
    } catch {}
    setOrderId(rawId);
  }, [rawId]);

  // Bangun URL default (prefix /api)
  useEffect(() => {
    const p = `/api/orders/${encodeURIComponent(orderId)}/invoice/preview`;
    const d = `/api/orders/${encodeURIComponent(orderId)}/invoice`;
    setPreviewUrl(p);
    setDownloadUrl(d);
    triedAliasRef.current = false;
  }, [orderId]);

  const title = useMemo(() => `Invoice — ${orderId}`, [orderId]);

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Berikut adalah pratinjau invoice. Anda dapat mengunduhnya melalui tombol
        di bawah.
      </p>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <iframe
          src={previewUrl}
          title={`Invoice ${orderId}`}
          style={{ width: "100%", height: 720, border: "none" }}
          onError={() => {
            if (!triedAliasRef.current) {
              triedAliasRef.current = true;
              const aliasPreview = `/api/orders/${encodeURIComponent(
                orderId
              )}/invoice`;
              const aliasDownload = `/api/orders/${encodeURIComponent(
                orderId
              )}/invoice`;
              setPreviewUrl(aliasPreview);
              setDownloadUrl(aliasDownload);
              setError(null);
            } else {
              setError("Gagal memuat preview invoice dari backend.");
            }
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "flex-end",
          alignItems: "center",
          marginTop: 16,
        }}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.location.assign("/")}
        >
          Kembali ke Home
        </Button>
        <Button asChild>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
            Download PDF
          </a>
        </Button>
      </div>
    </div>
  );
}
