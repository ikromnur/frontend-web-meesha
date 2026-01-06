import ProductsPage from "@/components/pages/landing-page/products";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Products",
};

const Product = () => {
  return <ProductsPage />;
};

export default Product;
