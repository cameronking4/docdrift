import { notFound } from "next/navigation";
import { getAllSlugs, getDocBySlug } from "@/lib/docs";
import { MDXContent } from "@/components/mdx-content";

export function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return { title: "Not Found" };
  return {
    title: `${doc.title} - DocDrift Docs`,
    description: `DocDrift documentation: ${doc.title}`,
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  return <MDXContent source={doc.content} />;
}
