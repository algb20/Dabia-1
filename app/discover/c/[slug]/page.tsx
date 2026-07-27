import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getCategoryBySlug, getCategoryProducts } from "@/lib/discover/store";
import { ProductCard } from "@/components/discover/ui";

export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryBySlug(slug);
  return c ? { title: c.name, description: c.blurb } : { title: "Category" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, products] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryProducts(slug),
  ]);
  if (!category) notFound();

  return (
    <section className="d-wrap d-section" style={{ paddingTop: 34 }}>
      <div className="d-stack" style={{ gap: 8, marginBottom: 26 }}>
        <span className="d-eyebrow">Category</span>
        <h1 className="d-h1" style={{ fontSize: "clamp(28px,3.6vw,40px)" }}>
          {category.name}
        </h1>
        <p className="d-lead">{category.blurb}</p>
      </div>
      <div className="d-grid">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
