import { getDocBySlug } from "@/lib/docs";
import { MDXContent } from "@/components/mdx-content";

export default function DocsIndex() {
  const doc = getDocBySlug("overview");
  if (!doc) return <p>No documentation found.</p>;

  return <MDXContent source={doc.content} />;
}
