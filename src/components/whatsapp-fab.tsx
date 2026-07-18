import { MessageCircle } from "lucide-react";

export function WhatsAppFab({ phone }: { phone?: string | null }) {
  if (!phone || phone.trim().length === 0) {
    return null;
  }
  const cleanPhone = phone.trim().replace(/\D/g, "");
  const href = `https://wa.me/${cleanPhone}?text=Hello, I want to ask about this product`;
  
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/40 transition hover:scale-105"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
