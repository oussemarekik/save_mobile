import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi, transformOrder } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Clock, CheckCircle2, X, Eye, ShoppingBag, ArrowLeft, User, Package, DollarSign, QrCode, Camera, Keyboard } from "lucide-react";
import { motion } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";

export default function ProviderOrders() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Fetch provider's orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/orders/provider"],
    queryFn: async () => {
      const backendOrders = await ordersApi.getForProvider();
      return backendOrders?.map(transformOrder).filter(Boolean) || [];
    },
    enabled: isAuthenticated,
  });

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

  const scanOrderMutation = useMutation({
    mutationFn: (qrCodeToken: string) => ordersApi.scan(qrCodeToken),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      toast({
        title: "Order found",
        description: "Order has been confirmed via QR scan",
      });
      setShowQRScanner(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Invalid QR code or order not found",
        variant: "destructive",
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
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl mb-4">Provider account required</h2>
        </div>
      </div>
    );
  }

  const activeOrders = orders?.filter(o => o.status === "pending" || o.status === "confirmed") || [];
  const pastOrders = orders?.filter(o => (o.status === "confirmed" && o.collectedAt) || o.status === "cancelled" || o.status === "expired") || [];

  const filteredOrders = filter === "all" 
    ? orders 
    : filter === "pending" 
    ? activeOrders 
    : pastOrders;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/provider/dashboard")}
              className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-2xl">Orders</h1>
          </div>
          <button
            onClick={() => setShowQRScanner(true)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
          >
            <QrCode className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            All ({orders?.length || 0})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === "pending"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            Pending ({activeOrders.length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === "completed"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            Completed ({pastOrders.length})
          </button>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          <div className="space-y-3">
            {filteredOrders.map((order: any) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedOrder(order)}
                className="bg-card rounded-xl p-4 border border-border cursor-pointer hover:border-primary transition-colors"
              >
                {/* Client Info */}
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {order.user?.username || order.user?.email || `Client #${order.userId || order.id}`}
                    </p>
                    {order.user?.phoneNumber && (
                      <p className="text-xs text-muted-foreground">
                        {order.user.phoneNumber}
                      </p>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    order.status === "confirmed" ? "bg-emerald-100 text-emerald-800" :
                    order.status === "cancelled" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {order.status}
                  </div>
                </div>

                {/* Order Details - Compact */}
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    {order.product?.imageUrl && (
                      <img 
                        src={order.product.imageUrl} 
                        alt={order.product.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm mb-1 line-clamp-1">
                        {order.product?.name || order.offer?.title || "Order"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span>Qty: {order.quantity}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-semibold text-foreground">
                            ${((order.totalPrice || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {order.product?.pickupStart && order.product?.pickupEnd && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{order.product.pickupStart} - {order.product.pickupEnd}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    {order.status !== "cancelled" && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono font-semibold text-foreground">
                          {order.pickupCode || order.qrCodeToken || order.id}
                        </span>
                        <span className="ml-2">Pickup Code</span>
                      </div>
                    )}
                    {order.status === "pending" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmOrderMutation.mutate(order.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-secondary/30 rounded-xl p-8 text-center border border-border border-dashed">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No orders found</p>
          </div>
        )}
      </div>

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
          onScan={(token) => scanOrderMutation.mutate(token)}
        />
      )}
    </div>
  );
}

function QRScannerModal({ onClose, onScan }: { onClose: () => void; onScan: (token: string) => void }) {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [qrCode, setQrCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Don't auto-start camera - Safari on iOS requires user interaction
    // User will need to click "Start Camera" button
    if (mode === "manual" && scannerRef.current) {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [mode]);

  const startCamera = async () => {
    try {
      setError(null);
      setScanning(true);
      
      // Check if camera is available
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setError("No camera found. Please ensure your device has a camera.");
        setScanning(false);
        return;
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      // Try to start with back camera first, fallback to any camera
      let cameraId: string | { facingMode: string } = { facingMode: "environment" };
      
      // Find back camera if available
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        cameraId = backCamera.id;
      }

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Successfully scanned
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent while scanning)
          // Only log if it's a critical error
          if (errorMessage && !errorMessage.includes('NotFoundException')) {
            console.debug("Scan error (normal):", errorMessage);
          }
        }
      );
      setScanning(false); // Camera started successfully
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMessage = "Failed to start camera.";
      
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        errorMessage = "Camera permission denied. Please allow camera access in Safari settings and try again.";
      } else if (err.name === 'NotFoundError' || err.message?.includes('camera')) {
        errorMessage = "No camera found. Please ensure your device has a camera.";
      } else if (err.name === 'NotReadableError' || err.message?.includes('busy')) {
        errorMessage = "Camera is busy or already in use. Please close other apps using the camera.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping camera:", err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanSuccess = (decodedText: string) => {
    stopCamera();
    onScan(decodedText);
    onClose();
  };

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
        className="bg-background rounded-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="font-display font-bold text-2xl flex items-center gap-2">
            <QrCode className="w-6 h-6" />
            Scan QR Code
          </h2>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-4 border-b border-border">
          <button
            onClick={() => {
              if (mode !== "camera") {
                setMode("camera");
              }
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === "camera"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <button
            onClick={() => {
              if (mode !== "manual") {
                stopCamera();
                setMode("manual");
              }
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === "manual"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Manual
          </button>
        </div>

        {/* Camera Scanner */}
        {mode === "camera" && (
          <div className="p-4">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-3">
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-1">Camera Error</p>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
                {error.includes("permission") && (
                  <div className="bg-white rounded-lg p-3 text-left text-xs text-red-700">
                    <p className="font-semibold mb-1">To fix this:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Tap the "aA" icon in Safari's address bar</li>
                      <li>Select "Website Settings"</li>
                      <li>Set Camera to "Allow"</li>
                      <li>Refresh the page and try again</li>
                    </ol>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setError(null);
                      setMode("manual");
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium"
                  >
                    Use Manual Entry
                  </button>
                  <button
                    onClick={async () => {
                      setError(null);
                      await stopCamera();
                      setTimeout(() => {
                        startCamera();
                      }, 500);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : scanning ? (
              <div className="relative">
                <div
                  id="qr-reader"
                  ref={scannerContainerRef}
                  className="w-full rounded-xl overflow-hidden bg-black"
                  style={{ minHeight: "300px" }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-primary rounded-lg w-64 h-64" />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Point your camera at the QR code
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Camera is starting...
                </p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  Start Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Entry */}
        {mode === "manual" && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Enter QR Code Token</label>
              <input
                type="text"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Enter pickup code"
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border font-mono"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                Enter the pickup code from the customer's order
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-secondary/50 text-foreground font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!qrCode.trim()}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                Confirm Pickup
              </button>
            </div>
          </form>
        )}
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

