import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offersApi, ordersApi, transformOrder, storageApi, usersApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Plus, Package, ShoppingBag, Clock, CheckCircle2, X, Edit, Trash2, ArrowLeft, QrCode, DollarSign, TrendingUp, User, MapPin, Phone, Settings, Eye, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { transformOfferToProduct } from "@/lib/api-client";

export default function ProviderDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "offers">("overview");

  // Fetch provider's offers
  const { data: offers, isLoading } = useQuery({
    queryKey: ["/offers/owner"],
    queryFn: () => offersApi.getByOwner(user?.id || 0),
    enabled: !!user?.id && typeof user.id === 'number',
  });

  // Fetch provider's orders
  const { data: orders } = useQuery({
    queryKey: ["/orders/provider"],
    queryFn: async () => {
      const backendOrders = await ordersApi.getForProvider();
      // Transform backend orders (with offer) to frontend format (with product)
      return backendOrders?.map(transformOrder).filter(Boolean) || [];
    },
    enabled: isAuthenticated,
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
          <Link href="/signin">
            <button className="py-3 px-6 rounded-xl bg-primary text-primary-foreground font-bold">
              Sign In
            </button>
          </Link>
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
          <p className="text-muted-foreground mb-6">
            You need a provider account to access the dashboard
          </p>
          <Link href="/provider/signup">
            <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold">
              Create Provider Account
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const activeOrders = orders?.filter(o => o.status === "pending" || o.status === "confirmed") || [];
  const pastOrders = orders?.filter(o => (o.status === "confirmed" && o.collectedAt) || o.status === "cancelled" || o.status === "expired") || [];
  
  // Calculate analytics
  // Only count confirmed and collected orders for revenue (exclude cancelled/expired)
  const revenueOrders = orders?.filter(o => o.status === "confirmed" && o.collectedAt) || [];
  const totalRevenue = revenueOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0) / 100;
  const totalOrders = orders?.length || 0;
  const completedOrders = pastOrders.length;
  
  const confirmOrderMutation = useMutation({
    mutationFn: (id: number) => ordersApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      toast({
        title: "Order confirmed",
        description: "Pickup has been confirmed",
      });
      setSelectedOrder(null);
    },
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl">Dashboard</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-border">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "orders"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "offers"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            Offers
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {activeTab === "overview" && (
          <>
            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">{offers?.length || 0}</span>
                </div>
                <div className="text-xs text-muted-foreground">Active Offers</div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <span className="text-2xl font-bold">{activeOrders.length}</span>
                </div>
                <div className="text-xs text-muted-foreground">Pending Orders</div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold">${totalRevenue.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">Total Revenue</div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="text-2xl font-bold">{completedOrders}</span>
                </div>
                <div className="text-xs text-muted-foreground">Completed Orders</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="font-bold text-lg mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-card rounded-xl p-4 border border-border flex items-center gap-3 hover:border-primary transition-colors"
                >
                  <Plus className="w-6 h-6 text-primary" />
                  <div className="text-left">
                    <div className="font-bold text-sm">Publish Offer</div>
                    <div className="text-xs text-muted-foreground">Create new offer</div>
                  </div>
                </button>
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="bg-card rounded-xl p-4 border border-border flex items-center gap-3 hover:border-primary transition-colors"
                >
                  <QrCode className="w-6 h-6 text-primary" />
                  <div className="text-left">
                    <div className="font-bold text-sm">Scan QR Code</div>
                    <div className="text-xs text-muted-foreground">Confirm pickup</div>
                  </div>
                </button>
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="bg-card rounded-xl p-4 border border-border flex items-center gap-3 hover:border-primary transition-colors"
                >
                  <Settings className="w-6 h-6 text-primary" />
                  <div className="text-left">
                    <div className="font-bold text-sm">Edit Profile</div>
                    <div className="text-xs text-muted-foreground">Business info</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Orders */}
            {activeOrders.length > 0 && (
              <section>
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Recent Pending Orders
                </h2>
                <div className="space-y-3">
                  {activeOrders.slice(0, 3).map((order: any) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-card rounded-xl p-4 border border-border cursor-pointer hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold">{order.product?.name || order.offer?.title || "Order"}</h3>
                          <p className="text-sm text-muted-foreground">
                            Code: <span className="font-mono font-bold">{order.pickupCode || order.id}</span>
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          ${((order.totalPrice || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmOrderMutation.mutate(order.id);
                          }}
                          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="px-4 py-2 rounded-lg bg-secondary/50 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {activeOrders.length > 3 && (
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="w-full mt-3 py-2 text-sm text-primary font-medium"
                  >
                    View all orders →
                  </button>
                )}
              </section>
            )}
          </>
        )}

        {activeTab === "orders" && (
          <>
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <section>
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Pending Pickups ({activeOrders.length})
                </h2>
                <div className="space-y-3">
                  {activeOrders.map((order: any) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-card rounded-xl p-4 border border-border cursor-pointer hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold">{order.product?.name || order.offer?.title || "Order"}</h3>
                          <p className="text-sm text-muted-foreground">
                            Pickup code: <span className="font-mono font-bold">{order.pickupCode || order.id}</span>
                          </p>
                          {order.product?.store && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Customer order • Qty: {order.quantity}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-primary">
                          ${((order.totalPrice || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmOrderMutation.mutate(order.id);
                          }}
                          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                        >
                          Confirm Pickup
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="px-4 py-2 rounded-lg bg-secondary/50 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Completed Orders */}
            {pastOrders.length > 0 && (
              <section>
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Completed Orders ({pastOrders.length})
                </h2>
                <div className="space-y-3">
                  {pastOrders.map((order: any) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-card rounded-xl p-4 border border-border cursor-pointer hover:border-primary transition-colors opacity-75"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold">{order.product?.name || order.offer?.title || "Order"}</h3>
                          <p className="text-sm text-muted-foreground">
                            {order.collectedAt
                              ? `Collected ${new Date(order.collectedAt).toLocaleDateString()}`
                              : order.status === "cancelled"
                              ? "Cancelled"
                              : "Expired"}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">
                          ${((order.totalPrice || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeOrders.length === 0 && pastOrders.length === 0 && (
              <div className="bg-secondary/30 rounded-xl p-8 text-center border border-border border-dashed">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            )}
          </>
        )}

        {activeTab === "offers" && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                My Offers ({offers?.length || 0})
              </h2>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Publish Offer</span>
              </button>
            </div>
            
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
          </section>
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirm={(id) => confirmOrderMutation.mutate(id)}
        />
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onScan={(token) => {
            ordersApi.scan(token).then(() => {
              queryClient.invalidateQueries({ queryKey: ["/orders"] });
              toast({ title: "Order found", description: "Order details loaded" });
            }).catch((err) => {
              toast({ title: "Error", description: err.message, variant: "destructive" });
            });
          }}
        />
      )}

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <ProfileEditModal
          user={user}
          onClose={() => setShowProfileEdit(false)}
          onSuccess={() => {
            setShowProfileEdit(false);
            queryClient.invalidateQueries({ queryKey: ["/auth/get-user-by-token"] });
          }}
        />
      )}
    </div>
  );
}

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
              <label className="text-sm font-medium mb-1 block">Original Price ($) <span className="text-muted-foreground text-xs">(optional)</span></label>
              <input
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                placeholder="15.99"
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border"
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

      if (!offer.id) {
        throw new Error("Offer ID is missing");
      }

      console.log("Updating offer:", offer.id, updateData);
      await offersApi.update(offer.id, updateData);

      toast({
        title: "Offer updated!",
        description: "Your changes have been saved",
        className: "bg-primary text-primary-foreground border-none",
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error updating offer:", error);
      console.error("Offer ID:", offer.id);
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

function OrderDetailsModal({ order, onClose, onConfirm }: { order: any; onClose: () => void; onConfirm: (id: number) => void }) {
  const product = order.product || order.offer;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-background rounded-2xl w-full max-w-md p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display font-bold text-2xl">Order Details</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {product?.imageUrl && (
            <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-xl" />
          )}
          
          <div>
            <h3 className="font-bold text-lg">{product?.name || order.offer?.title || "Order"}</h3>
            <p className="text-sm text-muted-foreground mt-1">{product?.description || order.offer?.description}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{order.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">${((order.totalPrice || 0) / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-medium capitalize ${
                order.status === "confirmed" ? "text-green-500" :
                order.status === "pending" ? "text-orange-500" :
                "text-muted-foreground"
              }`}>
                {order.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pickup Code:</span>
              <span className="font-mono font-bold">{order.pickupCode || order.qrCodeToken || order.id}</span>
            </div>
            {order.createdAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date:</span>
                <span className="font-medium text-sm">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {product?.pickupStart && product?.pickupEnd && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup Time:</span>
                <span className="font-medium">{product.pickupStart} - {product.pickupEnd}</span>
              </div>
            )}
          </div>

          {order.status === "pending" && (
            <button
              onClick={() => onConfirm(order.id)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold mt-4"
            >
              Confirm Pickup
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function QRScannerModal({ onClose, onScan }: { onClose: () => void; onScan: (token: string) => void }) {
  const [qrCode, setQrCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCode.trim()) {
      onScan(qrCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-background rounded-2xl w-full max-w-md p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display font-bold text-2xl flex items-center gap-2">
            <QrCode className="w-6 h-6" />
            Scan QR Code
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Enter QR Code Token</label>
            <input
              type="text"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="Scan or enter QR code"
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border font-mono"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Enter the pickup code from the customer's order
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
              disabled={!qrCode.trim()}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
            >
              Scan
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ProfileEditModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
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
              <User className="w-4 h-4" />
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

