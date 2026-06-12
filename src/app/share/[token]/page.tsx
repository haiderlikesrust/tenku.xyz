import { SharePageClient } from "@/components/share-page-client";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  return <SharePageClient token={token} />;
}
