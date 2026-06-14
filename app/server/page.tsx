import { SectionCard } from "@/components/shared/section-card";

export default function ServerPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <SectionCard
        title="Internal status page"
        description="This route is reserved for internal diagnostics and framework experiments. The main product experience lives on the primary Mentorly pages."
      />
    </main>
  );
}
