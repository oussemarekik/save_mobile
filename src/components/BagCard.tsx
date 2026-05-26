import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Clock, ShoppingBag, Heart } from "lucide-react";
import { motion } from "framer-motion";
import type { Product, Store } from "@/lib/mock-data";
import { useFavorites, useToggleFavorite, useCreateOrder } from "@/hooks/use-shop";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface BagCardProps {
  product: Product;
  store: Store;
}

export function BagCard({ product, store }: BagCardProps) {
  const { data: favorites } = useFavorites();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isFavorited, setIsFavorited] = useState(favorites?.includes(product.id) || false);

  // Calculate discount only if originalPrice exists and is greater than price
  const originalPriceValue = product.originalPrice || 0;
  const priceValue = product.price || 0;
  const discount = originalPriceValue > priceValue && originalPriceValue > 0
    ? Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100)
    : 0;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
    setIsFavorited(!isFavorited);
  };

  const handleOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to order this bag",
        variant: "destructive",
      });
      setLocation("/signin");
      return;
    }

    if (product.quantity === 0) {
      toast({
        title: "Sold out",
        description: "This item is no longer available",
        variant: "destructive",
      });
      return;
    }

    createOrder(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => {
          toast({
            title: "Order placed!",
            description: "Your Magic Bag is reserved.",
            className: "bg-primary text-primary-foreground border-none",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error?.message || "Failed to place order",
            variant: "destructive",
          });
        },
      }
    );
  };

  const price = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceValue / 100);

  const originalPrice = originalPriceValue > 0
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(originalPriceValue / 100)
    : null;

  return (
    <Link href={`/product/${product.id}`}>
      <motion.div 
        whileHover={{ scale: 0.98 }}
        whileTap={{ scale: 0.96 }}
        className="group relative flex flex-col w-full bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
      >
        {/* Image Section - Top */}
        <div className="relative w-full h-40 overflow-hidden bg-muted">
          <img
            src={product.imageUrl || store?.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'}
            alt={product.name || 'Food offer'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';
            }}
          />
          {product.quantity === 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-sm">Sold Out</span>
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {discount > 0 && (
              <div className="bg-accent text-accent-foreground px-2 py-1 rounded-md text-xs font-bold shadow-md">
                {discount}% OFF
              </div>
            )}
            <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-foreground shadow-md">
              {product.quantity > 0 ? `${product.quantity} left` : 'Sold out'}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleFavorite}
            className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors shadow-md"
          >
            <Heart
              size={16}
              className={isFavorited ? "fill-red-500 text-red-500" : "text-gray-400"}
            />
          </motion.button>
          {store.logoUrl && (
            <div className="absolute -bottom-4 right-3 w-10 h-10 rounded-full border-2 border-background overflow-hidden shadow-md bg-white">
              <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Content Section - Bottom */}
        <div className="p-3 flex flex-col gap-2">
          <div>
            <h3 className="font-display font-bold text-base leading-tight text-foreground line-clamp-1 mb-0.5">{store?.name || 'Unknown Store'}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{product.name || 'Food Offer'}</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-md">
              <Clock size={12} />
              <span>{product.pickupStart} - {product.pickupEnd}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-primary">{price}</span>
              {originalPrice && originalPriceValue > priceValue && (
                <span className="text-xs text-muted-foreground line-through decoration-destructive/30">{originalPrice}</span>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOrder}
              disabled={isPending || product.quantity === 0}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
            >
              {isPending ? (
                <>
                  <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>...</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={14} />
                  <span>Order</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
