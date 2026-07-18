import { MessageCircle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStore";

export function WhatsAppButton() {
  const { data: settings } = useStoreSettings();
  const number = settings?.whatsapp_number?.replace(/\D/g, "");
  if (!number) return null;
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-success text-success-foreground shadow-pop transition-transform hover:scale-105"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
