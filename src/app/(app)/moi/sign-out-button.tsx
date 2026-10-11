"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { forgetPushOnThisDevice } from "@/components/settings/reminder-toggle";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="soft"
      size="lg"
      loading={pending}
      icon={<LogOut size={20} />}
      onClick={async () => {
        setPending(true);
        // Her reminders must not keep reaching a device she signed out of.
        await forgetPushOnThisDevice();
        await authClient.signOut();
        router.replace("/connexion");
        router.refresh();
      }}
    >
      Me déconnecter
    </Button>
  );
}
