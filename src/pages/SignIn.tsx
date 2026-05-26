import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { authApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { GoogleOAuthButton, FacebookOAuthButton } from "@/components/OAuthButtons";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeRedirectPath } from "@/lib/redirect-utils";

export default function SignIn() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Fields required",
        description: "Please enter your email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.login(email, password);
      
      // Invalidate and refetch auth query to get user data
      await queryClient.invalidateQueries({ queryKey: ["/auth/get-user-by-token"] });
      
      // Get updated user data to check role
      const userData = await authApi.getUserByToken();
      
      toast({
        title: "Success!",
        description: "You've been signed in successfully.",
        className: "bg-primary text-primary-foreground border-none",
      });

      // Redirect based on user role, normalizing any old paths
      const redirectTo = normalizeRedirectPath(response.redirectTo, userData?.role);
      setLocation(redirectTo);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-auto"
        >
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-4xl mb-2 text-foreground">
              Food Saver
            </h1>
            <p className="text-muted-foreground">
              Sign in to save food and money
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6 mb-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Auth */}
          <div className="space-y-3">
            <GoogleOAuthButton />
            <FacebookOAuthButton />
          </div>

          {/* Sign up link */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-center text-muted-foreground mb-3">
              Don't have an account?
            </p>
            <Link href="/signup">
              <button className="w-full py-3 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-all active:scale-[0.99] font-medium">
                Create Account
              </button>
            </Link>
          </div>

          {/* Provider sign up */}
          <div className="mt-4">
            <p className="text-sm text-center text-muted-foreground mb-3">
              Are you a business?
            </p>
            <Link href="/provider/signup">
              <button className="w-full py-3 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-all active:scale-[0.99] font-medium">
                Create Provider Account
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

