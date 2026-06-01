import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { User, MapPin, Phone, Settings, LogOut, ArrowLeft, X, Store } from "lucide-react";
import { motion } from "framer-motion";

export default function ProviderProfile() {
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleSignOut = () => {
    logout();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully",
    });
    setLocation("/signin");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="font-display font-bold text-2xl mb-4">Sign in required</h2>
        </div>
      </div>
    );
  }

  if (user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl mb-4">Provider account required</h2>
        </div>
      </div>
    );
  }

  const displayName = user?.username || user?.email || "Provider";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/provider/dashboard")}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-2xl">Profile</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* User Info */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
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
            <p className="text-xs text-primary font-medium mt-1">Provider Account</p>
          </div>
        </div>

        {/* Business Information */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Business Information</h3>
          
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            {user?.username && (
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Business Name</p>
                  <p className="font-medium">{user.username}</p>
                </div>
              </div>
            )}
            
            {user?.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{user.location}</p>
                </div>
              </div>
            )}
            
            {user?.mapsLink && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Google Maps</p>
                  <a 
                    href={user.mapsLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    View on Maps
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="w-full flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary transition-all active:scale-[0.99] font-medium"
          >
            <Settings className="w-5 h-5" />
            <span>Edit Business Information</span>
          </button>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-[0.99] font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            queryClient.invalidateQueries({ queryKey: ["/auth/get-user-by-token"] });
          }}
        />
      )}
    </div>
  );
}

function EditProfileModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    location: user?.location || "",
    phoneNumber: user?.phoneNumber?.toString() || "",
    mapsLink: user?.mapsLink || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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

      toast({
        title: "Profile updated!",
        description: "Your business information has been saved",
        className: "bg-primary text-primary-foreground border-none",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="bg-background rounded-t-3xl w-full max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display font-bold text-2xl">Edit Business Profile</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-2">
              <Store className="w-4 h-4" />
              Business Name
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Your business name"
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="123 Main St, City, State ZIP"
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Google Maps Link
            </label>
            <input
              type="url"
              value={formData.mapsLink}
              onChange={(e) => setFormData({ ...formData, mapsLink: e.target.value })}
              placeholder="https://maps.google.com/..."
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Help customers find your location easily
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-secondary/50 border border-border font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

