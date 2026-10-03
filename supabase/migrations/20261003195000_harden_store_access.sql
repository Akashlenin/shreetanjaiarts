create index order_items_product_id_idx on public.order_items (product_id);

create policy "No direct order access"
on public.orders for all
to anon, authenticated
using (false)
with check (false);

create policy "No direct order item access"
on public.order_items for all
to anon, authenticated
using (false)
with check (false);

revoke execute on function public.create_store_order(text,text,text,jsonb) from authenticated;
