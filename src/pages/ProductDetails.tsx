import React, { useState, useEffect } from "react";
import { useProduct, useCreateOrder, useFavorites, useToggleFavorite } from "@/hooks/use-shop";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, Share2, Heart, Clock, MapPin, Star, AlertCircle, Info, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetails() {
  const [, params] = useRoute("/product/:id");
  const id = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: product, isLoading } = useProduct(id);
  const { user, isAuthenticated } = useAuth();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { data: favorites } = useFavorites();
  const { mutate: toggleFavorite } = useToggleFavorite();
  
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (favorites && id) {
      setIsFavorite(favorites.includes(id));
    }
  }, [favorites, id]);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!product) return <div className="p-8 text-center">Product not found</div>;

  const handleOrder = () => {
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
        description: "This offer is no longer available",
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
            description: "Your order has been placed successfully",
            className: "bg-primary text-primary-foreground border-none",
          });
          setTimeout(() => setLocation("/orders"), 1000);
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error?.response?.data?.message || error?.message || "Failed to place order",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleFavorite = () => {
    toggleFavorite(id);
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite ? "This bag is no longer in your favorites" : "This bag has been saved to your favorites",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.store.name} - ${product.name}`,
          text: `Check out this Magic Bag from ${product.store.name}!`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.price / 100);
  const originalPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.originalPrice / 100);

  return (
    <div className="bg-background min-h-screen pb-28 relative">
      {/* Hero Image */}
      <div className="relative h-[40vh] w-full">
        <img 
          src={product.imageUrl || product.store.imageUrl} 
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        
        {/* Header Actions */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pt-safe">
          <button 
            onClick={() => history.back()}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ChevronLeft />
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <Share2 size={20} />
            </button>
            <button 
              onClick={handleFavorite}
              className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                isFavorite 
                  ? "bg-red-500/80 text-white hover:bg-red-500" 
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-8 bg-background rounded-t-3xl px-6 pt-8 pb-4 space-y-6">
        {/* Title & Store */}
        <div className="border-b border-border pb-6">
          <div className="flex justify-between items-start mb-2">
            <h1 className="font-display font-bold text-2xl text-foreground">{product.store.name}</h1>
            <div className="flex flex-col items-end">
               <span className="font-bold text-2xl text-primary">{price}</span>
               <span className="text-sm text-muted-foreground line-through decoration-destructive/30">{originalPrice}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
             <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">{product.store.category}</span>
             <span>•</span>
             <div className="flex items-center gap-1 text-orange-500">
               <Star size={14} fill="currentColor" />
               <span className="font-medium text-foreground">{product.store.rating}</span>
               <span className="text-muted-foreground">(500+)</span>
             </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3 items-start">
             <Clock className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
             <div>
                <p className="font-bold text-orange-800 text-sm">Collection Time</p>
                <p className="text-orange-700 text-sm">Today {product.pickupStart} - {product.pickupEnd}</p>
             </div>
          </div>
        </div>

        {/* What you get */}
        <div className="space-y-3">
          <h2 className="font-display font-bold text-lg">What you could get</h2>
          <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
             <div className="flex gap-3">
               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                 <AlertCircle size={20} />
               </div>
               <div>
                 <h4 className="font-bold text-sm mb-1">{product.name}</h4>
                 <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
                 <p className="text-xs text-muted-foreground mt-2 italic flex items-center gap-1">
                   <Info size={12} /> Contents depend on unsold items
                 </p>
               </div>
             </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3 pb-8">
           <h2 className="font-display font-bold text-lg">Location</h2>
           <div className="flex items-start gap-3">
             <MapPin className="text-muted-foreground mt-1" />
             <div>
               <p className="font-medium">{product.store.address}</p>
               <p className="text-sm text-muted-foreground mt-1">1.2 km away</p>
             </div>
           </div>
           <div className="h-32 w-full bg-muted rounded-xl relative overflow-hidden">
             {/* Fake map placeholder */}
             <div className="absolute inset-0 bg-[url('https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fmt1.google.com%2Fvt%2Flyrs%3Dm%26x%3D13%26y%3D24%26z%3D5&f=1&nofb=1')] opacity-50 bg-cover bg-center" />
             <div className="absolute inset-0 flex items-center justify-center">
                <button className="bg-white text-foreground font-semibold px-4 py-2 rounded-lg shadow-sm text-sm hover:bg-gray-50">Get Directions</button>
             </div>
           </div>
        </div>
      </div>

      {/* Order Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-20 pb-safe">
        <button
          onClick={handleOrder}
          disabled={product.quantity === 0 || isPending}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              <span>Ordering...</span>
            </>
          ) : product.quantity > 0 ? (
            <>
              <ShoppingBag size={20} />
              <span>Order</span>
            </>
          ) : (
            "Sold Out"
          )}
        </button>
      </div>
    </div>
  );
}
