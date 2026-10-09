"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
        await authClient.signOut();
        router.replace("/connexion");
        router.refresh();
      }}
    >
      Me déconnecter
    </Button>
  );
}
