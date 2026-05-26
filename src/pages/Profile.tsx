import React from "react";
import { User, Settings, CreditCard, HelpCircle, ChevronRight, LogOut, Store, Leaf, ShoppingBag, Award, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-shop";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Profile() {
  const { user, logout, isAuthenticated } = useAuth();
  const { data: orders } = useOrders();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Calculate impact metrics - orders that are confirmed and have been collected
  const collectedOrders = orders?.filter(o => o.status === "confirmed" && o.collectedAt) || [];
  const mealsSaved = collectedOrders.length;
  const co2Saved = mealsSaved * 2.5; // Approximate kg CO2 per meal saved
  const moneySaved = collectedOrders.reduce((sum, order) => {
    const saved = (order.product?.originalPrice || 0) - (order.totalPrice || 0);
    return sum + saved;
  }, 0) / 100;

  const handleSignOut = () => {
    logout();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully",
    });
    setLocation("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-24 px-4 pt-10 flex flex-col items-center justify-center">
        <div className="text-center max-w-sm">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl mb-2">Sign in required</h2>
          <p className="text-muted-foreground mb-6">
            Sign in to view your profile and track your impact
          </p>
          <Link href="/signin">
            <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold">
              Sign In
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = user?.username || user?.email || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-10">
      <h1 className="font-display font-bold text-3xl mb-8">Profile</h1>

      {/* User Info */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold overflow-hidden">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-xl">{displayName}</h2>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white"
        >
          <Leaf className="w-6 h-6 mb-2" />
          <div className="text-2xl font-bold">{mealsSaved}</div>
          <div className="text-xs opacity-90">Meals Saved</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white"
        >
          <Award className="w-6 h-6 mb-2" />
          <div className="text-2xl font-bold">{co2Saved.toFixed(1)}</div>
          <div className="text-xs opacity-90">kg CO₂ Saved</div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white"
        >
          <ShoppingBag className="w-6 h-6 mb-2" />
          <div className="text-2xl font-bold">${moneySaved.toFixed(0)}</div>
          <div className="text-xs opacity-90">Money Saved</div>
        </motion.div>
      </div>

      {/* Pending Provider Status */}
      {user?.role === "PENDING_PROVIDER" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-yellow-700" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-yellow-900 text-sm">Pending to become a provider</p>
            <p className="text-xs text-yellow-700 mt-0.5">Your request is being reviewed</p>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="space-y-2 mb-6">
        <MenuItem icon={User} label="Account Details" />
        <MenuItem icon={CreditCard} label="Payment Methods" />
        <MenuItem icon={Settings} label="Preferences" />
        <MenuItem icon={HelpCircle} label="Help & Support" />
        
        {user?.role === "PROVIDER" && (
          <Link href="/provider/dashboard">
            <MenuItem icon={Store} label="Provider Dashboard" />
          </Link>
        )}
        
        {user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER" && (
          <Link href="/provider/signup">
            <MenuItem icon={Store} label="Become a Provider" />
          </Link>
        )}
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-[0.99] font-medium"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
      
      <div className="mt-12 text-center">
         <p className="text-xs text-muted-foreground font-medium">Version 2.4.0 (Build 182)</p>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all group active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Icon size={20} />
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </button>
  );
}
