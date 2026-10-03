export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_paise: number;
  compare_at_paise: number | null;
  image_path: string;
  dimensions: string;
  materials: string;
  stock_qty: number;
  badge: string | null;
  featured: boolean;
};

export type CartLine = {
  product: Product;
  quantity: number;
};
