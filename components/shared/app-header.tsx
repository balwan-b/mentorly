import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { SiteLogo } from "./site-logo";
import { NotificationBell } from "./notification-bell";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <SiteLogo />
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link className="rounded-full px-3 py-2 transition-colors hover:bg-accent hover:text-foreground" href="/">Home</Link>
          <Link className="rounded-full px-3 py-2 transition-colors hover:bg-accent hover:text-foreground" href="/mentors">Mentors</Link>
          <Show when="signed-in">
            <Link className="rounded-full px-3 py-2 transition-colors hover:bg-accent hover:text-foreground" href="/profile">Profile</Link>
            <Link className="rounded-full px-3 py-2 transition-colors hover:bg-accent hover:text-foreground" href="/requests">Requests</Link>
            <Link className="rounded-full px-3 py-2 transition-colors hover:bg-accent hover:text-foreground" href="/availability">Availability</Link>
            <Link className="rounded-full px-3 py-2 transition-colors hover:bg-accent hover:text-foreground" href="/bookings">Bookings</Link>
            <NotificationBell />
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost">Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Get started</Button>
            </SignUpButton>
          </Show>
        </nav>
      </div>
    </header>
  );
}
