import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Floating shortcut into the admin dashboard.
 * Only rendered for signed-in admins AND only on Android devices.
 */
export function AdminFab() {
  const { isAdmin } = useAuth();
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsAndroid(/android/i.test(navigator.userAgent));
    }
  }, []);

  if (!isAdmin || !isAndroid) return null;

  return (
    <Link
      to="/admin"
      aria-label="Open admin dashboard"
      className="fixed bottom-5 left-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-pop transition-transform hover:scale-105"
    >
      <LayoutDashboard className="h-6 w-6" />
    </Link>
  );
}
