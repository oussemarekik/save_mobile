import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offersApi, transformOfferToProduct, storageApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Package, Plus, Edit, Trash2, ArrowLeft, X, Camera } from "lucide-react";
import { motion } from "framer-motion";

export default function ProviderOffers() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);

  // Fetch provider's offers
  const { data: offers, isLoading } = useQuery({
    queryKey: ["/offers/owner"],
    queryFn: () => offersApi.getByOwner(user?.id || 0),
    enabled: !!user?.id && typeof user.id === 'number',
  });

  const deleteOfferMutation = useMutation({
    mutationFn: (id: number) => offersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/offers"] });
      toast({
        title: "Offer deleted",
        description: "Your offer has been removed",
      });
    },
  });

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
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl mb-4">Provider account required</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/provider/dashboard")}
              className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-2xl">My Offers</h1>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : offers && offers.length > 0 ? (
          <div className="space-y-3">
            {offers.map((offer: any) => {
              const product = transformOfferToProduct(offer);
              return (
                <div key={offer.id} className="bg-card rounded-xl overflow-hidden border border-border">
                  <div className="flex h-24">
                    <div className="w-24 bg-muted relative">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity} available
                        </p>
                      </div>
                      <div className="text-sm font-bold text-primary">
                        ${(product.price / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-secondary/30 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Pickup: {product.pickupStart} - {product.pickupEnd}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingOffer(offer)}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        title="Edit offer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this offer?")) {
                            deleteOfferMutation.mutate(offer.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Delete offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-secondary/30 rounded-xl p-8 text-center border border-border border-dashed">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No offers yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Publish Your First Offer</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Offer Modal */}
      {showCreateForm && (
        <CreateOfferModal
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({ queryKey: ["/offers"] });
          }}
        />
      )}

      {/* Edit Offer Modal */}
      {editingOffer && (
        <EditOfferModal
          offer={editingOffer}
          onClose={() => setEditingOffer(null)}
          onSuccess={() => {
            setEditingOffer(null);
            queryClient.invalidateQueries({ queryKey: ["/offers"] });
          }}
        />
      )}
    </div>
  );
}

// Reuse the CreateOfferModal and EditOfferModal from ProviderDashboard
// For now, I'll create simplified versions here
function CreateOfferModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    originalPrice: "",
    quantity: "",
    pickupStartTime: "17:00",
    pickupEndTime: "18:00",
    foodType: "meal", // Backend expects: snack, meal, beverage, other
    taste: "neutral", // Backend expects: sweet, salty, both, neutral
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Images is required by backend, so we need at least an empty array
      let images = "[]";
      if (selectedImage) {
        setUploadingImage(true);
        const uploadResult = await storageApi.upload([selectedImage]);
        if (uploadResult && uploadResult.length > 0) {
          images = JSON.stringify([uploadResult[0]]);
        }
        setUploadingImage(false);
      }

      // Convert time inputs (HH:MM) to full ISO datetime strings
      // Validate and parse time strings
      const parseTime = (timeStr: string): { hours: number; minutes: number } => {
        const defaultTime = { hours: 17, minutes: 0 };
        if (!timeStr || typeof timeStr !== 'string') return defaultTime;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return defaultTime;
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return defaultTime;
        }
        return { hours, minutes };
      };

      const startTime = parseTime(formData.pickupStartTime);
      const endTime = parseTime(formData.pickupEndTime);
      
      const today = new Date();
      const pickupStartDateTime = new Date(today);
      pickupStartDateTime.setHours(startTime.hours, startTime.minutes, 0, 0);
      const pickupEndDateTime = new Date(today);
      pickupEndDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);
      
      // Validate the dates are valid
      if (isNaN(pickupStartDateTime.getTime()) || isNaN(pickupEndDateTime.getTime())) {
        throw new Error("Invalid pickup times provided");
      }

      const createData: any = {
        title: formData.title,
        description: formData.description || "",
        price: Math.round(parseFloat(formData.price) * 100),
        quantity: parseInt(formData.quantity),
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        pickupStartTime: pickupStartDateTime.toISOString(),
        pickupEndTime: pickupEndDateTime.toISOString(),
        foodType: formData.foodType as any, // Backend enum: snack, meal, beverage, other
        taste: formData.taste as any, // Backend enum: sweet, salty, both, neutral
        images, // Required by backend - must be a JSON string (even if empty array)
      };
      
      // Only include originalPrice if provided
      if (formData.originalPrice) {
        createData.originalPrice = Math.round(parseFloat(formData.originalPrice) * 100);
      }

      await offersApi.create(createData);

      toast({
        title: "Offer published!",
        description: "Your offer is now live and visible to customers",
        className: "bg-primary text-primary-foreground border-none",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create offer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadingImage(false);
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
          <div>
            <h2 className="font-display font-bold text-2xl">Publish New Offer</h2>
            <p className="text-sm text-muted-foreground mt-1">Create and publish a new food offer</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Magic Bag"
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mixed pastries, sandwiches, and more..."
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="4.99"
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Original Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                placeholder="15.99"
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="10"
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Pickup Start</label>
              <input
                type="time"
                value={formData.pickupStartTime}
                onChange={(e) => setFormData({ ...formData, pickupStartTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Pickup End</label>
              <input
                type="time"
                value={formData.pickupEndTime}
                onChange={(e) => setFormData({ ...formData, pickupEndTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select
                value={formData.foodType}
                onChange={(e) => setFormData({ ...formData, foodType: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              >
                <option value="meal">Meals</option>
                <option value="snack">Bread & Pastries</option>
                <option value="beverage">Beverages</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Taste</label>
              <select
                value={formData.taste}
                onChange={(e) => setFormData({ ...formData, taste: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
              >
                <option value="neutral">Neutral</option>
                <option value="sweet">Sweet</option>
                <option value="salty">Salty</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Image</label>
            <div className="space-y-2">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
              )}
              <label className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border cursor-pointer hover:bg-secondary transition-colors">
                <Camera className="w-5 h-5" />
                <span>{imagePreview ? "Change Image" : "Upload Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            </div>
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
              disabled={isLoading || uploadingImage}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
            >
              {isLoading || uploadingImage ? "Publishing..." : "Publish Offer"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function EditOfferModal({ offer, onClose, onSuccess }: { offer: any; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const product = transformOfferToProduct(offer);
  
  // Helper to extract time (HH:MM) from datetime string or return default
  const extractTimeFromDateTime = (dateTime: string | Date | null | undefined, defaultTime: string): string => {
    if (!dateTime) return defaultTime;
    try {
      const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
      if (isNaN(date.getTime())) return defaultTime;
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return defaultTime;
    }
  };
  
  const [formData, setFormData] = useState({
    title: offer.title || product.name || "",
    description: offer.description || "",
    price: ((offer.price || product.price || 0) / 100).toFixed(2),
    originalPrice: ((offer.originalPrice || product.originalPrice || 0) / 100).toFixed(2),
    quantity: offer.quantity || product.quantity || "",
    pickupStartTime: extractTimeFromDateTime(offer.pickupStartTime, "17:00"),
    pickupEndTime: extractTimeFromDateTime(offer.pickupEndTime, "18:00"),
    foodType: offer.foodType || "meal", // Backend enum: snack, meal, beverage, other
    taste: offer.taste || "neutral", // Backend enum: sweet, salty, both, neutral
  });

  React.useEffect(() => {
    if (product.imageUrl) {
      setImagePreview(product.imageUrl);
    }
  }, [product.imageUrl]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Handle images - if no new image selected, keep existing or send empty array
      let imagesToSend = "[]";
      if (selectedImage) {
        setUploadingImage(true);
        const uploadResult = await storageApi.upload([selectedImage]);
        if (uploadResult && uploadResult.length > 0) {
          imagesToSend = JSON.stringify([uploadResult[0]]);
        }
        setUploadingImage(false);
      } else if (offer.images) {
        // If existing images are already in the right format, use them
        if (typeof offer.images === 'string') {
          imagesToSend = offer.images;
        } else if (Array.isArray(offer.images)) {
          imagesToSend = JSON.stringify(offer.images);
        }
      }

      // Convert time inputs (HH:MM) to full ISO datetime strings
      // Validate and parse time strings
      const parseTime = (timeStr: string): { hours: number; minutes: number } => {
        const defaultTime = { hours: 17, minutes: 0 };
        if (!timeStr || typeof timeStr !== 'string') return defaultTime;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return defaultTime;
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return defaultTime;
        }
        return { hours, minutes };
      };

      const startTime = parseTime(formData.pickupStartTime);
      const endTime = parseTime(formData.pickupEndTime);
      
      const today = new Date();
      const pickupStartDateTime = new Date(today);
      pickupStartDateTime.setHours(startTime.hours, startTime.minutes, 0, 0);
      const pickupEndDateTime = new Date(today);
      pickupEndDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);
      
      // Validate the dates are valid
      if (isNaN(pickupStartDateTime.getTime()) || isNaN(pickupEndDateTime.getTime())) {
        throw new Error("Invalid pickup times provided");
      }

      const updateData: any = {
        title: formData.title,
        description: formData.description || "",
        price: Math.round(parseFloat(formData.price) * 100),
        quantity: parseInt(formData.quantity),
        pickupStartTime: pickupStartDateTime.toISOString(),
        pickupEndTime: pickupEndDateTime.toISOString(),
        foodType: formData.foodType as any,
        taste: formData.taste as any,
        images: imagesToSend,
      };
      
      // Only include originalPrice if provided
      if (formData.originalPrice) {
        updateData.originalPrice = Math.round(parseFloat(formData.originalPrice) * 100);
      }

      await offersApi.update(offer.id, updateData);

      toast({
        title: "Offer updated!",
        description: "Your changes have been saved",
        className: "bg-primary text-primary-foreground border-none",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update offer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadingImage(false);
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
          <h2 className="font-display font-bold text-2xl">Edit Offer</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Original Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Pickup Start</label>
              <input
                type="time"
                value={formData.pickupStartTime}
                onChange={(e) => setFormData({ ...formData, pickupStartTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Pickup End</label>
              <input
                type="time"
                value={formData.pickupEndTime}
                onChange={(e) => setFormData({ ...formData, pickupEndTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select
                value={formData.foodType}
                onChange={(e) => setFormData({ ...formData, foodType: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
                required
              >
                <option value="meal">Meals</option>
                <option value="snack">Bread & Pastries</option>
                <option value="beverage">Beverages</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Taste</label>
              <select
                value={formData.taste}
                onChange={(e) => setFormData({ ...formData, taste: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
              >
                <option value="neutral">Neutral</option>
                <option value="sweet">Sweet</option>
                <option value="salty">Salty</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Image</label>
            <div className="space-y-2">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
              )}
              <label className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border cursor-pointer hover:bg-secondary transition-colors">
                <Camera className="w-5 h-5" />
                <span>{selectedImage ? "Change Image" : "Update Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            </div>
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
              disabled={isLoading || uploadingImage}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
            >
              {isLoading || uploadingImage ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

