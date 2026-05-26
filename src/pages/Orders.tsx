import React, { useState } from "react";
import { useOrders } from "@/hooks/use-shop";
import { Link } from "wouter";
import { Clock, CheckCircle2, XCircle, ShoppingBag, Package, MapPin, QrCode, X, ExternalLink, ChevronDown, ChevronUp, Download, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

export default function Orders() {
  const { data: orders, isLoading } = useOrders();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const pendingOrders = orders?.filter(o => o.status === "pending") || [];
  const confirmedOrders = orders?.filter(o => o.status === "confirmed" && !o.collectedAt) || [];
  const pastOrders = orders?.filter(o => (o.status === "confirmed" && o.collectedAt) || o.status === "cancelled" || o.status === "expired") || [];

  const cancelOrderMutation = useMutation({
    mutationFn: (id: number) => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      toast({
        title: "Order cancelled",
        description: "Your order has been cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    },
  });

  const hasOrders = orders && orders.length > 0;

  return (
    <div className="min-h-screen bg-background pb-28 px-4 pt-6">
      <h1 className="font-display font-bold text-2xl mb-4">My Orders</h1>

      {/* Stats Cards - Mobile Optimized */}
      {hasOrders && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className={`bg-gradient-to-br from-yellow-50 to-amber-50 border rounded-lg p-2 shadow-sm ${pendingOrders.length > 0 ? 'border-yellow-200' : 'border-yellow-100 opacity-50'}`}>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${pendingOrders.length > 0 ? 'bg-yellow-100' : 'bg-yellow-50'}`}>
                <Clock className={`w-3 h-3 ${pendingOrders.length > 0 ? 'text-yellow-700' : 'text-yellow-400'}`} />
              </div>
              <p className={`text-sm font-bold ${pendingOrders.length > 0 ? 'text-yellow-800' : 'text-yellow-600'}`}>
                {pendingOrders.length}
              </p>
              <p className={`text-[9px] font-medium ${pendingOrders.length > 0 ? 'text-yellow-700' : 'text-yellow-500'}`}>
                Pending
              </p>
            </div>
          </div>
          <div className={`bg-gradient-to-br from-emerald-50 to-green-50 border rounded-lg p-2 shadow-sm ${confirmedOrders.length > 0 ? 'border-emerald-200' : 'border-emerald-100 opacity-50'}`}>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${confirmedOrders.length > 0 ? 'bg-emerald-100' : 'bg-emerald-50'}`}>
                <CheckCircle2 className={`w-3 h-3 ${confirmedOrders.length > 0 ? 'text-emerald-700' : 'text-emerald-400'}`} />
              </div>
              <p className={`text-sm font-bold ${confirmedOrders.length > 0 ? 'text-emerald-800' : 'text-emerald-600'}`}>
                {confirmedOrders.length}
              </p>
              <p className={`text-[9px] font-medium ${confirmedOrders.length > 0 ? 'text-emerald-700' : 'text-emerald-500'}`}>
                Confirmed
              </p>
            </div>
          </div>
          <div className={`bg-gradient-to-br from-gray-50 to-slate-50 border rounded-lg p-2 shadow-sm ${pastOrders.length > 0 ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${pastOrders.length > 0 ? 'bg-gray-100' : 'bg-gray-50'}`}>
                <Package className={`w-3 h-3 ${pastOrders.length > 0 ? 'text-gray-700' : 'text-gray-400'}`} />
              </div>
              <p className={`text-sm font-bold ${pastOrders.length > 0 ? 'text-gray-800' : 'text-gray-600'}`}>
                {pastOrders.length}
              </p>
              <p className={`text-[9px] font-medium ${pastOrders.length > 0 ? 'text-gray-700' : 'text-gray-500'}`}>
                Past
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-yellow-700" />
              </div>
              <h2 className="text-lg font-bold">Pending Orders</h2>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-semibold">
                {pendingOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {pendingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onCancel={() => cancelOrderMutation.mutate(order.id)}
                  isCancelling={cancelOrderMutation.isPending}
                />
              ))}
            </div>
          </section>
        )}

        {/* Confirmed Orders */}
        {confirmedOrders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <h2 className="text-lg font-bold">Confirmed Orders</h2>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-semibold">
                {confirmedOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {confirmedOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}

        {/* Past Orders */}
        {pastOrders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3 opacity-60">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-gray-700" />
              </div>
              <h2 className="text-lg font-bold">Past Orders</h2>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-[10px] font-semibold">
                {pastOrders.length}
              </span>
            </div>
            <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
              {pastOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!isLoading && !hasOrders && (
          <div className="bg-card rounded-2xl p-8 text-center border border-border border-dashed mt-8">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
              <ShoppingBag size={28} />
            </div>
            <h2 className="text-lg font-bold mb-2">No orders yet</h2>
            <p className="text-sm text-muted-foreground mb-6">Start saving food and money!</p>
            <Link href="/browse" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors text-sm">
              Browse Offers
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onCancel, isCancelling }: { order: any; onCancel?: () => void; isCancelling?: boolean }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const getStatusConfig = () => {
    switch (order.status) {
      case "pending":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-300",
          text: "text-yellow-800",
          badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
          icon: Clock,
        };
      case "confirmed":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-300",
          text: "text-emerald-800",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: CheckCircle2,
        };
      case "cancelled":
        return {
          bg: "bg-red-50",
          border: "border-red-300",
          text: "text-red-800",
          badge: "bg-red-100 text-red-800 border-red-300",
          icon: XCircle,
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-300",
          text: "text-gray-800",
          badge: "bg-gray-100 text-gray-800 border-gray-300",
          icon: Package,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const product = order.product || {};
  const store = product.store || {};

  const orderDate = new Date(order.createdAt);
  const collectedDate = order.collectedAt ? new Date(order.collectedAt) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-2 ${statusConfig.border}`}
    >
      <div className="p-4">
        {/* Header Section - Mobile Optimized */}
        <div className="flex gap-3 mb-3">
          {/* Image - Larger on mobile */}
          <div className="flex-shrink-0 w-20 h-20 relative rounded-xl overflow-hidden shadow-md border-2 border-border">
            <img
              src={product.imageUrl || store.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'}
              alt={product.name || 'Order'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';
              }}
            />
          </div>

          {/* Title, Status, Quantity and Price - Right side */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground mb-1.5 break-words line-clamp-2 leading-tight">
                {product.name || 'Order'}
              </h3>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${statusConfig.badge} mb-1.5`}>
                <StatusIcon className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
                  {order.status}
                </span>
              </div>
            </div>
            {/* Quantity and Price at bottom right */}
            <div className="flex flex-col items-end gap-1 mt-auto">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Package className="w-3 h-3 flex-shrink-0" />
                <span>Qty: {order.quantity}</span>
              </div>
              <div>
                <span className="text-base font-bold text-primary">
                  ${((order.totalPrice || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info Bar - Mobile First */}
        {order.status === "pending" && product.pickupStart && product.pickupEnd && (
          <div className="bg-primary/5 rounded-lg px-3 py-2 mb-3 border border-primary/20">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground">Pickup: {product.pickupStart} - {product.pickupEnd}</span>
            </div>
          </div>
        )}

        {/* Information Grid - Collapsible */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 gap-2.5 mb-3 overflow-hidden"
            >
              {/* Pickup Location */}
              <div className="flex items-start gap-2.5 p-3 bg-secondary/50 rounded-xl border border-border">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Pickup Location
                  </p>
                  <p className="text-xs font-medium text-foreground mb-1 break-words">
                    {store.address || store.location || 'Location not specified'}
                  </p>
                  {store.mapsLink && (
                    <a
                      href={store.mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors active:scale-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span>Open in Maps</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Order Date */}
              <div className="flex items-start gap-2.5 p-3 bg-secondary/50 rounded-xl border border-border">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Ordered On
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {orderDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {orderDate.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Picked Up At */}
              {order.status === "confirmed" && collectedDate && (
                <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Picked Up At
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {collectedDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {collectedDate.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Details Button - Larger touch target */}
        <div className="mb-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-secondary hover:bg-secondary/80 active:bg-secondary/70 text-foreground rounded-xl font-medium transition-colors text-sm touch-manipulation"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Hide Details</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Show Details</span>
              </>
            )}
          </button>
        </div>

        {/* Actions Section - Mobile Optimized */}
        {showDetails && (
          <div className="flex flex-col gap-2.5 pt-3 border-t border-border">
            {order.status === "pending" && order.pickupCode && (
              <button
                onClick={() => setShowQRCode(!showQRCode)}
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground rounded-xl font-semibold shadow-md transition-all text-sm touch-manipulation"
              >
                <QrCode className="w-4 h-4" />
                <span>{showQRCode ? "Hide QR Code" : "Show QR Code"}</span>
                {showQRCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            {order.status === "pending" && onCancel && (
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold transition-all text-sm touch-manipulation ${
                  isCancelling
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-md"
                }`}
              >
                <X className="w-4 h-4" />
                <span>{isCancelling ? "Cancelling..." : "Cancel Order"}</span>
              </button>
            )}
          </div>
        )}

        {/* QR Code Section - Mobile Optimized */}
        <AnimatePresence>
          {order.status === "pending" && order.pickupCode && showQRCode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-border overflow-hidden"
            >
              <div className="bg-card rounded-xl p-4 border-2 border-border shadow-sm">
                <div className="text-center mb-3">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    Pickup QR Code
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Show this QR code to the provider
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3">
                  {/* QR Code - Larger for mobile */}
                  <div className="p-3 bg-white rounded-xl border-2 border-border shadow-sm">
                    <QRCodeSVG
                      id={`qr-code-${order.id}`}
                      value={order.pickupCode}
                      size={180}
                      level="M"
                      includeMargin={true}
                    />
                  </div>

                  <div className="w-full space-y-2">
                    <div className="p-2.5 bg-secondary/50 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground mb-1">Order Code</p>
                      <p className="text-sm font-mono font-semibold text-foreground break-all">
                        {order.pickupCode}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(order.pickupCode);
                          setCopied(true);
                          toast({
                            title: "Copied!",
                            description: "Pickup code copied to clipboard",
                          });
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary hover:bg-secondary/80 active:bg-secondary/70 text-foreground rounded-lg font-medium transition-colors text-sm touch-manipulation"
                      >
                        {copied ? (
                          <>
                            <Check size={16} />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const svg = document.getElementById(`qr-code-${order.id}`);
                          if (!svg) return;

                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d");
                          const img = new Image();

                          img.onload = () => {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx?.drawImage(img, 0, 0);
                            const pngFile = canvas.toDataURL("image/png");
                            const downloadLink = document.createElement("a");
                            downloadLink.download = `order-${order.id}-qr.png`;
                            downloadLink.href = pngFile;
                            downloadLink.click();
                            toast({
                              title: "Downloaded!",
                              description: "QR code saved to your device",
                            });
                          };

                          img.src = "data:image/svg+xml;base64," + btoa(svgData);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground rounded-lg font-medium transition-colors text-sm touch-manipulation"
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
