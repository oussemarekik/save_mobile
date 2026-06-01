import { useLocalSearchParams } from "expo-router";
import ProductDetails from "../pages/ProductDetails";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductDetails id={id} />;
}