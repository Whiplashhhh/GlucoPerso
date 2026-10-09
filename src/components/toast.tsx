"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

/** Toast shown once after a redirect, then the query string is cleaned. */
export function FlashToast({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return <Toast message={message} onDone={() => router.replace(pathname, { scroll: false })} />;
}

/** Small top toast that fades away by itself, with an optional action. */
export function Toast({
  message,
  action,
  duration = 4000,
  onDone,
}: {
  message: string;
  action?: ReactNode;
  duration?: number;
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="fixed inset-x-0 top-3 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-[20px] bg-ink px-4 py-3 pt-safe font-bold text-bg shadow-lift"
        >
          <span className="flex-1">{message}</span>
          {action}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
