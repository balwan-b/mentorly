import { LoadingState } from "@/components/shared/loading-state";

export default function AppLoading() {
  return (
    <main className="mentorly-page">
      <LoadingState label="Loading Mentorly..." />
    </main>
  );
}
