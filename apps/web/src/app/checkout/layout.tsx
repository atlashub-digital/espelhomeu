import "./checkout.css";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="checkout-root">{children}</div>;
}
