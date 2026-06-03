import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ProviderBottomNav() {
  const [location] = useLocation();

  const navItems = [
    { 
      icon: LayoutDashboard, 
      label: "Dashboard", 
      href: "/(provider)/dashboard", 
      matchPattern: (path: string) => 
        path === "/(provider)/dashboard" || 
        path.startsWith("/(provider)/dashboard/")
    },
    { 
      icon: Package, 
      label: "Offers", 
      href: "/provider/offers", 
      matchPattern: (path: string) => 
        path === "/provider/offers" || 
        path.startsWith("/provider/offers/")
    },
    { 
      icon: ShoppingBag, 
      label: "Orders", 
      href: "/provider/orders", 
      matchPattern: (path: string) => 
        path === "/provider/orders" || 
        path.startsWith("/provider/orders/")
    },
    { 
      icon: User, 
      label: "Profile", 
      href: "/provider/profile", 
      matchPattern: (path: string) => 
        path === "/provider/profile" || 
        path.startsWith("/provider/profile/")
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-lg shadow-black/10">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = item.matchPattern(location);
          return (
            <Link key={item.label} href={item.href} className="flex-1">
              <div
                className={cn(
                  "flex flex-col items-center justify-center py-2 transition-colors duration-200 cursor-pointer group select-none",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative p-1">
                  <item.icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={cn(
                      "transition-transform duration-200",
                      isActive && "scale-110",
                      "group-active:scale-95"
                    )}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="provider-nav-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium mt-0.5">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

