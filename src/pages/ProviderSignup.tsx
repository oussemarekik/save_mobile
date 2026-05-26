import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { usersApi, authApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Store, MapPin, Phone, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export default function ProviderSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    location: "",
    phoneNumber: "",
    mapsLink: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      // Only authenticated users can become providers
      if (!isAuthenticated) {
        toast({
          title: "Sign in required",
          description: "Please sign in first to create a provider account",
          variant: "destructive",
        });
        setLocation("/signin");
        setIsLoading(false);
        return;
      }

      // First, request provider status via the backend
      await usersApi.setRole("PROVIDER");
      
      // Then update user details (only include fields with values)
      const updateData: any = {};
      if (formData.username && formData.username.trim()) {
        updateData.username = formData.username.trim();
      }
      if (formData.location && formData.location.trim()) {
        updateData.location = formData.location.trim();
      }
      if (formData.phoneNumber && formData.phoneNumber.trim()) {
        updateData.phoneNumber = formData.phoneNumber.trim();
      }
      if (formData.mapsLink && formData.mapsLink.trim()) {
        updateData.mapsLink = formData.mapsLink.trim();
      }
      
      await usersApi.updateDetails(updateData);

      await queryClient.invalidateQueries({ queryKey: ["/auth/get-user-by-token"] });

      toast({
        title: "Request submitted!",
        description: "Your request to become a provider has been submitted and is pending approval",
        className: "bg-primary text-primary-foreground border-none",
      });

      setLocation("/profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create provider account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to sign in if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/")}
              className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-2xl">Become a Provider</h1>
          </div>
        </div>

        <div className="px-6 py-8 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 text-center"
          >
            <h2 className="font-display font-bold text-xl mb-4">Sign in required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in first to create a provider account
            </p>
            <button
              onClick={() => setLocation("/signin")}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold"
            >
              Go to Sign In
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-2xl">Become a Provider</h1>
        </div>
      </div>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                {s < 2 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      step > s ? "bg-primary" : "bg-secondary"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Business Info</span>
            <span>Location</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="font-display font-bold text-xl mb-6">
                Business Information
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Your business name"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  // Validate required fields before proceeding
                  if (!formData.username || !formData.phoneNumber) {
                    toast({
                      title: "Fields required",
                      description: "Please enter your business name and phone number",
                      variant: "destructive",
                    });
                    return;
                  }
                  setStep(2);
                }}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold mt-6"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="font-display font-bold text-xl mb-6">Location Details</h2>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="123 Main St, City, State ZIP"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Google Maps Link (optional)
                </label>
                <input
                  type="url"
                  value={formData.mapsLink}
                  onChange={(e) => setFormData({ ...formData, mapsLink: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
                <p className="text-xs text-muted-foreground">
                  Help customers find your location easily
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl bg-secondary/50 border border-border font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </motion.div>
          )}
        </form>

        <div className="mt-8 p-4 bg-secondary/30 rounded-xl border border-border">
          <h3 className="font-bold text-sm mb-2">What's next?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Create your first food offer</li>
            <li>• Set pickup times and prices</li>
            <li>• Start saving food from going to waste!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

