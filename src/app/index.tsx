import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "../lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"; 
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import { ProviderBottomNav } from "@/components/ProviderBottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import Orders from "@/pages/Orders";
import Profile from "@/pages/Profile";
import ProductDetails from "@/pages/ProductDetails";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import Callback from "@/pages/Callback";
import ProviderSignup from "@/pages/ProviderSignup";
import ProviderDashboard from "@/pages/ProviderDashboard";
import ProviderOrders from "@/pages/ProviderOrders";
import ProviderOffers from "@/pages/ProviderOffers";
import ProviderProfile from "@/pages/ProviderProfile";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isProvider = user?.role === "PROVIDER";
  
  const hideNavPaths = ['/signin', '/signup', '/provider/signup', '/callback'];
  const shouldShowNav = !hideNavPaths.some(path => location.startsWith(path));
  
  // Only show nav if user is authenticated
  // If user is a provider, show provider nav; otherwise show client nav
  const showProviderNav = shouldShowNav && isAuthenticated && isProvider;
  const showClientNav = shouldShowNav && isAuthenticated && !isProvider;

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen shadow-2xl relative overflow-hidden md:border-x md:border-border">
      <Switch>
        {/* Client Routes */}
        <Route path="/" component={Home} />
        <Route path="/browse" component={Browse} />
        <Route path="/orders">
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>
        <Route path="/product/:id" component={ProductDetails} />
        
        {/* Auth Routes */}
        <Route path="/signin" component={SignIn} />
        <Route path="/signup" component={SignUp} />
        <Route path="/callback/:token" component={Callback} />
        
        {/* Provider Routes */}
        <Route path="/provider/signup" component={ProviderSignup} />
        <Route path="/provider/dashboard">
          <ProtectedRoute requireRole="PROVIDER">
            <ProviderDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/provider/orders">
          <ProtectedRoute requireRole="PROVIDER">
            <ProviderOrders />
          </ProtectedRoute>
        </Route>
        <Route path="/provider/offers">
          <ProtectedRoute requireRole="PROVIDER">
            <ProviderOffers />
          </ProtectedRoute>
        </Route>
        <Route path="/provider/profile">
          <ProtectedRoute requireRole="PROVIDER">
            <ProviderProfile />
          </ProtectedRoute>
        </Route>
        
        <Route component={NotFound} />
      </Switch>
      {showProviderNav && <ProviderBottomNav />}
      {showClientNav && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
