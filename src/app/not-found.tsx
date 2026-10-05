import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <p className="text-sm text-muted-foreground">Page not found.</p>
      <Link href="/" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
        Back home
      </Link>
    </div>
  );
}
