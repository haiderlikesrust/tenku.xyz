import { Cloud, Share2, FileText, Shield } from "lucide-react";
import { LinkButton } from "@/components/link-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Cloud className="size-6" />
            <span className="text-lg font-semibold">Tenku</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LinkButton variant="outline" href="/login">
              Sign in
            </LinkButton>
            <LinkButton href="/register">Get started</LinkButton>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Store, organize, and share your files
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Tenku is a simple cloud storage app. Create folders, upload any file type,
            preview PDFs in your browser, and share public links with anyone.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <LinkButton size="lg" href="/register">
              Create free account
            </LinkButton>
            <LinkButton size="lg" variant="outline" href="/login">
              Sign in
            </LinkButton>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <Cloud className="mb-2 size-8" />
                <CardTitle>Cloud storage</CardTitle>
                <CardDescription>
                  Upload and organize files in nested folders from any device.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Share2 className="mb-2 size-8" />
                <CardTitle>Public sharing</CardTitle>
                <CardDescription>
                  Toggle any file or folder public and share it with a link.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="mb-2 size-8" />
                <CardTitle>File previews</CardTitle>
                <CardDescription>
                  View PDFs, images, text, video, and audio directly in the browser.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="py-12 text-center">
          <Shield className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Your files are stored securely on your own server.
          </p>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Cloud className="size-4" />
            Tenku
          </span>
          <span>tenku.xyz</span>
        </div>
      </footer>
    </div>
  );
}
