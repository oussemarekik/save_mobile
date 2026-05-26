import React from "react";
import { useStores, useProducts } from "@/hooks/use-shop";
import { BagCard } from "@/components/BagCard";
import { Search, MapPin, ChevronRight, Filter, Leaf, DollarSign, Heart, ArrowRight, Store } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: stores, isLoading: loadingStores } = useStores();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const [, setLocation] = useLocation();

  const featuredProducts = products?.filter(p => p.quantity > 0).slice(0, 5) || [];

  // Show welcoming page if user is not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Hero Section */}
        <section className="px-4 pt-8 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Leaf className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-display font-bold text-4xl mb-4 text-foreground">
              Welcome to Food Saver
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Save delicious food from going to waste. Help the planet while saving money.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-3 max-w-sm mx-auto mb-12"
          >
            <button
              onClick={() => setLocation("/signin")}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              Sign In
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setLocation("/signup")}
              className="w-full py-4 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-all active:scale-[0.99] font-medium"
            >
              Create Account
            </button>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6 max-w-md mx-auto"
          >
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Save the Planet</h3>
                  <p className="text-sm text-muted-foreground">
                    Reduce food waste and help fight climate change by rescuing unsold food from local businesses.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Save Money</h3>
                  <p className="text-sm text-muted-foreground">
                    Get delicious food at amazing prices. Save up to 70% on quality meals, pastries, and groceries.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Support Local</h3>
                  <p className="text-sm text-muted-foreground">
                    Help local businesses reduce waste while discovering amazing food from your neighborhood.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Provider CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 max-w-md mx-auto"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20 text-center">
              <Store className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Are you a business?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Join Food Saver and reduce food waste while earning extra revenue.
              </p>
              <button
                onClick={() => setLocation("/provider/signup")}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                Become a Provider
              </button>
            </div>
          </motion.div>
        </section>
      </div>
    );
  }

  if (loadingStores || loadingProducts || authLoading) {
    return (
      <div className="p-4 space-y-6 animate-pulse pb-24">
        <div className="h-8 bg-muted rounded-lg w-1/3"></div>
        <div className="h-40 bg-muted rounded-2xl w-full"></div>
        <div className="space-y-4">
          <div className="h-6 bg-muted rounded w-1/4"></div>
          <div className="flex gap-4 overflow-hidden">
            <div className="h-64 bg-muted rounded-2xl w-64 flex-shrink-0"></div>
            <div className="h-64 bg-muted rounded-2xl w-64 flex-shrink-0"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-primary cursor-pointer hover:opacity-80 transition-opacity">
            <MapPin className="w-5 h-5 fill-current" />
            <span className="font-bold text-foreground">San Francisco, CA</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search for bread, pizza, etc..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-muted-foreground text-sm font-medium"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-background shadow-sm border border-border hover:bg-muted/50">
            <Filter className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </header>

      <main className="space-y-8 pt-6">
        {/* Hero Section */}
        <section className="px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-6 text-primary-foreground shadow-lg shadow-primary/20 relative overflow-hidden"
          >
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-display font-bold mb-2">Save food, Save money</h2>
              <p className="text-primary-foreground/90 text-sm mb-6 max-w-[80%]">Help the planet by rescuing delicious unsold food from local shops.</p>
              <Link href="/browse" className="inline-block bg-white text-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all active:scale-95">
                Browse Bags
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Recommended Horizontal Scroll */}
        <section>
          <div className="flex items-center justify-between px-4 mb-4">
            <h3 className="font-display font-bold text-xl">Recommended for you</h3>
            <Link href="/browse" className="text-primary text-sm font-semibold hover:underline">See all</Link>
          </div>
          
          <div className="flex gap-4 overflow-x-auto px-4 pb-4 hide-scrollbar snap-x snap-mandatory">
            {featuredProducts.map((product) => (
              <div key={product.id} className="w-[280px] flex-shrink-0 snap-center">
                <BagCard product={product} store={product.store} />
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="px-4">
          <h3 className="font-display font-bold text-xl mb-4">Categories</h3>
          <div className="grid grid-cols-2 gap-3">
            {['Meals', 'Bread & Pastries', 'Groceries', 'Other'].map((cat, i) => (
              <motion.div 
                key={cat}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
              >
                <span className="font-semibold text-sm">{cat}</span>
                {/* Placeholder icon logic */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i % 2 === 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                   <ChevronRight size={14} />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* New Stores */}
        <section className="px-4 pb-8">
          <h3 className="font-display font-bold text-xl mb-4">New on the app</h3>
          <div className="space-y-4">
            {products?.slice(0, 3).map((product) => (
               <BagCard key={product.id} product={product} store={product.store} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
