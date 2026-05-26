import React, { useState } from "react";
import { useProducts, useFavorites } from "@/hooks/use-shop";
import { BagCard } from "@/components/BagCard";
import { Search, SlidersHorizontal } from "lucide-react";

export default function Browse() {
  const { data: products, isLoading } = useProducts();
  const { data: favorites } = useFavorites();
  const [filter, setFilter] = useState("all");

  const filteredProducts = products?.filter(p => {
    if (filter === "all") return true;
    if (filter === "available") return p.quantity > 0;
    if (filter === "favorites") return favorites?.includes(p.id);
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border p-4">
        <h1 className="font-display font-bold text-2xl mb-4">Browse</h1>
        
        <div className="flex gap-2">
           <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search map area..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border-none text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <button className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-foreground transition-colors">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-1">
          {['all', 'available', 'favorites'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                  : 'bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-7xl mx-auto">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl h-[400px] animate-pulse" />
          ))
        ) : (
          filteredProducts?.map((product) => (
            <BagCard key={product.id} product={product} store={product.store} />
          ))
        )}
        
        {!isLoading && filteredProducts?.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg">No bags found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search area.</p>
          </div>
        )}
      </div>
    </div>
  );
}
