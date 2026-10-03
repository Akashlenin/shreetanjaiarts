import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type OrderPayload = {
  customerName?: string;
  email?: string;
  phone?: string;
  items?: Array<{ productId?: string; quantity?: number }>;
};

export async function POST(request: Request) {
  let payload: OrderPayload;
  try {
    payload = (await request.json()) as OrderPayload;
  } catch {
    return NextResponse.json({ error: "The order could not be read." }, { status: 400 });
  }

  const customerName = payload.customerName?.trim() ?? "";
  const email = payload.email?.trim() ?? "";
  const phone = payload.phone?.trim() ?? "";
  const items = (payload.items ?? []).map((item) => ({
    product_id: item.productId,
    quantity: Number(item.quantity),
  }));

  if (!customerName || !email || !phone || items.length === 0) {
    return NextResponse.json({ error: "Please complete your contact details and choose at least one frame." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_store_order", {
    p_customer_name: customerName,
    p_email: email,
    p_phone: phone,
    p_items: items,
  });

  if (error) {
    const message = error.message.includes("violates") ? "The order details could not be validated." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ order: data }, { status: 201 });
}
