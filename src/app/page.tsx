import { Storefront } from "@/components/storefront";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product } from "@/types/store";

export const revalidate = 60;

async function getProducts(): Promise<Product[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,description,category,price_paise,compare_at_paise,image_path,dimensions,materials,stock_qty,badge,featured")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Unable to load the collection: ${error.message}`);
  return data as Product[];
}

export default async function Home() {
  const products = await getProducts();
  return <Storefront products={products} />;
}
