"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mentorly-page">
      <EmptyState
        title="Something went wrong"
        description="The app hit an unexpected error. Try again, and if it keeps happening, check the server logs."
      />
      <div className="mt-4 flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
