"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CartLine, Product } from "@/types/store";

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export function Storefront({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState("All pieces");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("thanjai-cart-v2");
      if (saved) setCart(JSON.parse(saved) as Record<string, number>);
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem("thanjai-cart-v2", JSON.stringify(cart));
  }, [cart]);

  const categories = ["All pieces", ...Array.from(new Set(products.map((product) => product.category)))];
  const visible = filter === "All pieces" ? products : products.filter((product) => product.category === filter);
  const lines: CartLine[] = useMemo(() => products.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id] })), [cart, products]);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price_paise * line.quantity, 0);
  const shipping = subtotal >= 1500000 || subtotal === 0 ? 0 : 75000;

  function changeQuantity(id: string, amount: number) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    setCart((current) => {
      const next = Math.max(0, Math.min(product.stock_qty, (current[id] ?? 0) + amount));
      const updated = { ...current };
      if (next === 0) delete updated[id]; else updated[id] = next;
      return updated;
    });
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setMessage(result.error ?? "We could not place the order. Please try again.");
      return;
    }
    setOrderNumber(result.order.order_number);
    setCart({});
  }

  return (
    <>
      <div className="announcement">Complimentary insured delivery across India on orders above ₹15,000</div>
      <header>
        <div className="wrap nav">
          <a className="brand" href="#top" aria-label="Thanjai Gild home"><span className="brandMark"/><span className="brandName">Thanjai Gild<small>Tanjavur Art Atelier</small></span></a>
          <nav aria-label="Main navigation"><a href="#collection">Collection</a><a href="#craft">Our craft</a><a href="#guide">Buying guide</a><a href="#story">Our story</a></nav>
          <button className="bag" onClick={() => setCartOpen(true)} aria-label={`Open bag with ${itemCount} items`}>Bag <span>{itemCount}</span></button>
        </div>
      </header>
      <main id="top">
        <section className="hero"><div className="wrap"><div className="heroInner"><div className="eyebrow">Rooted in Thanjavur · Made by hand</div><h1>Art with a <em>golden soul.</em></h1><p>Heirloom Tanjavur frames shaped by patient hands, traditional gesso relief and luminous gold foil—made to hold meaning for generations.</p><div className="actions"><a className="button primary" href="#collection">Explore the collection</a><a className="button outline" href="#craft">Discover the craft</a></div></div></div></section>
        <div className="promise"><div className="wrap promiseGrid"><div><b>✦</b><span><strong>Artisan-made</strong>Crafted in small batches in Tamil Nadu</span></div><div><b>◇</b><span><strong>Insured delivery</strong>Protective shipping across India</span></div><div><b>◎</b><span><strong>Authenticity card</strong>Material and craft details included</span></div></div></div>
        <section id="collection" className="collection"><div className="wrap"><div className="sectionHead"><div><div className="eyebrow wine">The signature collection</div><h2>Find a frame for<br/>your sacred space.</h2></div><p>Every piece is finished individually. Subtle variations in relief and tone are the mark of work made by hand.</p></div><div className="filters">{categories.map((category) => <button key={category} className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>{category}</button>)}</div><div className="products">{visible.map((product) => <article className="product" key={product.id}>{product.badge && <span className="badge">{product.badge}</span>}<div className="productMedia"><img src={product.image_path} alt={`${product.name} handcrafted Tanjavur art frame`}/></div><div className="productInfo"><div className="stock">{product.stock_qty > 0 ? `${product.stock_qty} available` : "Sold out"}</div><h3>{product.name}</h3><p>{product.description}</p><div className="meta">{product.dimensions} · {product.materials.split(",")[0]}</div><div className="priceRow"><span>{money(product.price_paise)}</span><button onClick={() => changeQuantity(product.id, 1)} disabled={product.stock_qty === 0} aria-label={`Add ${product.name} to bag`}>+</button></div></div></article>)}</div></div></section>
        <section className="craft" id="craft"><div className="wrap craftGrid"><div className="craftVisual"/><div><div className="eyebrow">A centuries-old practice</div><h2>Layered slowly.<br/>Made to endure.</h2><p>Tanjavur painting is known for its sculptural relief, glowing gold surface and jewel-like detail. Our pieces honour that visual language through a careful, many-stage process.</p><div className="steps"><div><b>01</b><span><strong>Drawing &amp; foundation</strong>The composition is drawn on a cloth-mounted wooden board.</span></div><div><b>02</b><span><strong>Relief &amp; embellishment</strong>Traditional gesso builds dimensional ornaments and detail.</span></div><div><b>03</b><span><strong>Gold &amp; colour</strong>Gold foil and rich pigments bring depth and radiance.</span></div></div></div></div></section>
        <section className="guide" id="guide"><div className="wrap"><div className="sectionHead"><div><div className="eyebrow wine">Choose with confidence</div><h2>A frame for every setting.</h2></div></div><div className="guideGrid"><div><i>01</i><h3>For a quiet corner</h3><p>Choose 12–16 inch formats for shelves, entry consoles and intimate prayer spaces.</p></div><div><i>02</i><h3>For a focal wall</h3><p>Our 18–24 inch pieces balance presence with versatility in living and dining rooms.</p></div><div><i>03</i><h3>For an heirloom gesture</h3><p>Grand formats make meaningful wedding, housewarming and milestone gifts.</p></div></div></div></section>
        <section id="story"><div className="wrap story"><div><div className="eyebrow wine">From the delta to your home</div><h2>Keeping a living tradition in view.</h2><p>Thanjavur art grew in the fertile Kaveri delta, shaped by temple culture, royal patronage and generations of artistic knowledge. Thanjai Gild is a contemporary doorway into that tradition.</p><blockquote>“A Tanjavur piece changes with the light. In the morning it glows; by evening, it feels illuminated from within.”</blockquote></div><div className="storyImage"/></div></section>
      </main>
      <footer><div className="wrap footerGrid"><div><div className="footerBrand">Thanjai Gild</div><p>Handcrafted Tanjavur art frames for meaningful homes and memorable occasions.</p></div><div><h4>Explore</h4><a href="#collection">Collection</a><a href="#craft">Our craft</a><a href="#guide">Buying guide</a></div><div><h4>Help</h4><a href="#guide">Size guide</a><a href="mailto:your-email@example.com">Contact atelier</a></div></div><div className="wrap footerBottom">© 2026 Thanjai Gild · Made with respect for the Tanjavur tradition.</div></footer>

      <div className={`backdrop ${cartOpen || checkoutOpen ? "open" : ""}`} onClick={() => { setCartOpen(false); setCheckoutOpen(false); }}/>
      <aside className={`drawer ${cartOpen ? "open" : ""}`} aria-hidden={!cartOpen}><div className="drawerHead"><h2>Your bag</h2><button onClick={() => setCartOpen(false)} aria-label="Close bag">×</button></div><div className="cartLines">{lines.length === 0 ? <div className="empty">Your bag is waiting for something meaningful.</div> : lines.map(({ product, quantity }) => <div className="cartLine" key={product.id}><img src={product.image_path} alt=""/><div><h3>{product.name}</h3><span>{money(product.price_paise)}</span><div className="quantity"><button onClick={() => changeQuantity(product.id, -1)}>−</button><b>{quantity}</b><button onClick={() => changeQuantity(product.id, 1)} disabled={quantity >= product.stock_qty}>+</button></div></div><strong>{money(product.price_paise * quantity)}</strong></div>)}</div><div className="drawerFoot"><div><span>Subtotal</span><b>{money(subtotal)}</b></div>{shipping > 0 && <small>Insured delivery: {money(shipping)}</small>}<button className="button primary full" disabled={!lines.length} onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Secure this selection</button></div></aside>
      <section className={`checkout ${checkoutOpen ? "open" : ""}`} aria-hidden={!checkoutOpen}><div className="checkoutBox"><button className="close" onClick={() => { setCheckoutOpen(false); setOrderNumber(""); }} aria-label="Close checkout">×</button>{orderNumber ? <div className="success"><div>✓</div><h2>Order received.</h2><p>Your reference is <strong>{orderNumber}</strong>. We’ll contact you to confirm the artwork, delivery and payment.</p><button className="button primary" onClick={() => { setCheckoutOpen(false); setOrderNumber(""); }}>Continue browsing</button></div> : <form onSubmit={submitOrder}><div className="eyebrow wine">Secure order request</div><h2>Confirm your selection.</h2><p>We’ll verify the hand-finished piece and delivery details before requesting payment.</p><label>Full name<input name="name" required minLength={2} autoComplete="name"/></label><label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Phone<input name="phone" type="tel" required autoComplete="tel"/></label>{message && <div className="formError">{message}</div>}<div className="checkoutTotal"><span>Total including delivery</span><b>{money(subtotal + shipping)}</b></div><button className="button primary full" disabled={submitting}>{submitting ? "Placing order…" : "Place order request"}</button></form>}</div></section>
    </>
  );
}
