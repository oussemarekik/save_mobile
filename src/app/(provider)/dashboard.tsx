import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, Image, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offersApi, ordersApi, storageApi, usersApi, transformOfferToProduct, transformOrder } from "@/lib/api-client";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";

const PRIMARY = "#16a34a";
type Tab = "overview" | "orders" | "offers";

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function ProviderDashboard() { 
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: offers, isLoading } = useQuery({
    queryKey: ["/offers/owner"],
    queryFn: () => offersApi.getByOwner(user?.id || 0),
    enabled: !!user?.id && typeof user.id === "number",
  });

  const { data: orders } = useQuery({
    queryKey: ["/orders/provider"],
    queryFn: async () => {
      const backendOrders = await ordersApi.getForProvider();
      return backendOrders?.map(transformOrder).filter(Boolean) || [];
    },
    enabled: isAuthenticated,
  });

  const deleteOfferMutation = useMutation({
    mutationFn: (id: number) => offersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/offers"] });
      Toast.show({ type: "success", text1: "Offer deleted", text2: "Your offer has been removed" });
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: (id: number) => ordersApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/orders"] });
      Toast.show({ type: "success", text1: "Order confirmed", text2: "Pickup has been confirmed" });
      setSelectedOrder(null);
    },
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredTitle}>Sign in required</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(auth)/signin")}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER") {
    return (
      <View style={styles.centered}>
        <Ionicons name="cube-outline" size={64} color="#888" />
        <Text style={styles.centeredTitle}>Provider account required</Text>
        <Text style={styles.centeredSubtitle}>You need a provider account to access the dashboard</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/(auth)/ProviderSignup")}>
          <Text style={styles.primaryButtonText}>Create Provider Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeOrders = orders?.filter((o: any) => o.status === "pending" || o.status === "confirmed") || [];
  const pastOrders = orders?.filter((o: any) =>
    (o.status === "confirmed" && o.collectedAt) || o.status === "cancelled" || o.status === "expired"
  ) || [];
  const revenueOrders = orders?.filter((o: any) => o.status === "confirmed" && o.collectedAt) || [];
  const totalRevenue = revenueOrders.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0) / 100;
  const completedOrders = pastOrders.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateForm(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["overview", "orders", "offers"] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {[
                { icon: "cube-outline", color: PRIMARY, value: offers?.length || 0, label: "Active Offers" },
                { icon: "time-outline", color: "#ea580c", value: activeOrders.length, label: "Pending Orders" },
                { icon: "cash-outline", color: "#16a34a", value: `$${totalRevenue.toFixed(2)}`, label: "Total Revenue" },
                { icon: "trending-up-outline", color: "#2563eb", value: completedOrders, label: "Completed Orders" },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <View style={styles.statRow}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.statsGrid}>
              {[
                { icon: "add-circle-outline", label: "Publish Offer", sub: "Create new offer", onPress: () => setShowCreateForm(true) },
                { icon: "qr-code-outline", label: "Scan QR Code", sub: "Confirm pickup", onPress: () => setShowQRScanner(true) },
                { icon: "settings-outline", label: "Edit Profile", sub: "Business info", onPress: () => setShowProfileEdit(true) },
              ].map((a) => (
                <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.onPress} activeOpacity={0.8}>
                  <Ionicons name={a.icon as any} size={24} color={PRIMARY} />
                  <Text style={styles.actionLabel}>{a.label}</Text>
                  <Text style={styles.actionSub}>{a.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Pending Orders */}
            {activeOrders.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Ionicons name="time-outline" size={18} color="#ea580c" />
                  <Text style={styles.sectionTitle}>Recent Pending Orders</Text>
                </View>
                {activeOrders.slice(0, 3).map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => setSelectedOrder(order)}
                    onConfirm={() => confirmOrderMutation.mutate(order.id)}
                  />
                ))}
                {activeOrders.length > 3 && (
                  <TouchableOpacity onPress={() => setActiveTab("orders")}>
                    <Text style={styles.viewAll}>View all orders →</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === "orders" && (
          <>
            {activeOrders.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Ionicons name="time-outline" size={18} color="#ea580c" />
                  <Text style={styles.sectionTitle}>Pending Pickups ({activeOrders.length})</Text>
                </View>
                {activeOrders.map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => setSelectedOrder(order)}
                    onConfirm={() => confirmOrderMutation.mutate(order.id)}
                  />
                ))}
              </>
            )}

            {pastOrders.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
                  <Text style={styles.sectionTitle}>Completed Orders ({pastOrders.length})</Text>
                </View>
                {pastOrders.map((order: any) => (
                  <TouchableOpacity
                    key={order.id}
                    style={[styles.orderCard, { opacity: 0.75 }]}
                    onPress={() => setSelectedOrder(order)}
                  >
                    <View style={styles.orderCardRow}>
                      <View>
                        <Text style={styles.orderTitle}>{order.product?.name || order.offer?.title || "Order"}</Text>
                        <Text style={styles.orderSub}>
                          {order.collectedAt
                            ? `Collected ${new Date(order.collectedAt).toLocaleDateString()}`
                            : order.status === "cancelled" ? "Cancelled" : "Expired"}
                        </Text>
                      </View>
                      <Text style={styles.orderPrice}>${((order.totalPrice || 0) / 100).toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {activeOrders.length === 0 && pastOrders.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name="bag-outline" size={48} color="#888" />
                <Text style={styles.emptyText}>No orders yet</Text>
              </View>
            )}
          </>
        )}

        {/* ── Offers Tab ── */}
        {activeTab === "offers" && (
          <>
            <View style={styles.sectionRow}>
              <Ionicons name="cube-outline" size={18} color={PRIMARY} />
              <Text style={styles.sectionTitle}>My Offers ({offers?.length || 0})</Text>
              <TouchableOpacity style={styles.smallPrimaryButton} onPress={() => setShowCreateForm(true)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.smallPrimaryButtonText}>Publish</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              [1, 2, 3].map((i) => <View key={i} style={styles.skeleton} />)
            ) : offers && offers.length > 0 ? (
              offers.map((offer: any) => {
                const product = transformOfferToProduct(offer);
                return (
                  <View key={offer.id} style={styles.offerCard}>
                    <View style={styles.offerCardTop}>
                      {product.imageUrl ? (
                        <Image source={{ uri: product.imageUrl }} style={styles.offerImage} />
                      ) : (
                        <View style={[styles.offerImage, styles.offerImagePlaceholder]}>
                          <Ionicons name="image-outline" size={24} color="#888" />
                        </View>
                      )}
                      <View style={styles.offerInfo}>
                        <Text style={styles.offerTitle}>{product.name}</Text>
                        <Text style={styles.offerSub}>{product.quantity} available</Text>
                        <Text style={styles.offerPrice}>${(product.price / 100).toFixed(2)}</Text>
                      </View>
                    </View>
                    <View style={styles.offerCardBottom}>
                      <Text style={styles.offerPickup}>
                        Pickup: {product.pickupStart} - {product.pickupEnd}
                      </Text>
                      <View style={styles.offerActions}>
                        <TouchableOpacity onPress={() => setEditingOffer(offer)} style={styles.iconButton}>
                          <Ionicons name="create-outline" size={18} color="#555" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            Alert.alert("Delete offer?", "This cannot be undone.", [
                              { text: "Cancel", style: "cancel" },
                              { text: "Delete", style: "destructive", onPress: () => deleteOfferMutation.mutate(offer.id) },
                            ])
                          }
                          style={styles.iconButton}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="cube-outline" size={48} color="#888" />
                <Text style={styles.emptyText}>No offers yet</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setShowCreateForm(true)}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Publish Your First Offer</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      {showCreateForm && (
        <CreateOfferModal
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => { setShowCreateForm(false); queryClient.invalidateQueries({ queryKey: ["/offers"] }); }}
        />
      )}
      {editingOffer && (
        <EditOfferModal
          offer={editingOffer}
          onClose={() => setEditingOffer(null)}
          onSuccess={() => { setEditingOffer(null); queryClient.invalidateQueries({ queryKey: ["/offers"] }); }}
        />
      )}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirm={(id) => confirmOrderMutation.mutate(id)}
        />
      )}
      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onScan={(token) => {
            ordersApi.scan(token)
              .then(() => { queryClient.invalidateQueries({ queryKey: ["/orders"] }); Toast.show({ type: "success", text1: "Order found" }); })
              .catch((err) => Toast.show({ type: "error", text1: "Error", text2: err.message }));
          }}
        />
      )}
      {showProfileEdit && (
        <ProfileEditModal
          user={user}
          onClose={() => setShowProfileEdit(false)}
          onSuccess={() => { setShowProfileEdit(false); queryClient.invalidateQueries({ queryKey: ["/auth/get-user-by-token"] }); }}
        />
      )}
    </View>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onPress, onConfirm }: { order: any; onPress: () => void; onConfirm: () => void }) {
  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.orderCardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderTitle}>{order.product?.name || order.offer?.title || "Order"}</Text>
          <Text style={styles.orderSub}>Code: <Text style={styles.mono}>{order.pickupCode || order.id}</Text></Text>
        </View>
        <Text style={styles.orderPrice}>${((order.totalPrice || 0) / 100).toFixed(2)}</Text>
      </View>
      <View style={styles.orderCardButtons}>
        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.8}>
          <Text style={styles.confirmButtonText}>Confirm Pickup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewButton} onPress={onPress} activeOpacity={0.8}>
          <Ionicons name="eye-outline" size={18} color="#555" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Shared form helpers ───────────────────────────────────────────────────────
const FOOD_TYPES = [
  { label: "Meals", value: "meal" },
  { label: "Bread & Pastries", value: "snack" },
  { label: "Beverages", value: "beverage" },
  { label: "Other", value: "other" },
];
const TASTES = [
  { label: "Neutral", value: "neutral" },
  { label: "Sweet", value: "sweet" },
  { label: "Salty", value: "salty" },
  { label: "Both", value: "both" },
];

function parseTime(timeStr: string) {
  const def = { hours: 17, minutes: 0 };
  if (!timeStr) return def;
  const parts = timeStr.split(":");
  if (parts.length !== 2) return def;
  const h = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return def;
  return { hours: h, minutes: m };
}

function timeToISO(timeStr: string) {
  const { hours, minutes } = parseTime(timeStr);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function extractTime(dt: string | Date | null | undefined, def = "17:00") {
  if (!dt) return def;
  try {
    const d = typeof dt === "string" ? new Date(dt) : dt;
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  } catch { return def; }
}

// ─── Shared BottomSheet wrapper ────────────────────────────────────────────────
function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <TouchableOpacity style={sheet.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={sheet.container}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Shared OfferForm fields ───────────────────────────────────────────────────
function OfferForm({ formData, setFormData, imageUri, onPickImage }: {
  formData: any; setFormData: (d: any) => void;
  imageUri: string | null; onPickImage: () => void;
}) {
  return (
    <>
      <Field label="Title">
        <TextInput style={styles.input} value={formData.title}
          onChangeText={(v) => setFormData({ ...formData, title: v })} placeholder="Magic Bag" />
      </Field>
      <Field label="Description">
        <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          value={formData.description} multiline
          onChangeText={(v) => setFormData({ ...formData, description: v })}
          placeholder="Mixed pastries, sandwiches..." />
      </Field>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="Price ($)">
            <TextInput style={styles.input} value={formData.price} keyboardType="decimal-pad"
              onChangeText={(v) => setFormData({ ...formData, price: v })} placeholder="4.99" />
          </Field>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Field label="Original Price ($)">
            <TextInput style={styles.input} value={formData.originalPrice} keyboardType="decimal-pad"
              onChangeText={(v) => setFormData({ ...formData, originalPrice: v })} placeholder="15.99" />
          </Field>
        </View>
      </View>
      <Field label="Quantity">
        <TextInput style={styles.input} value={String(formData.quantity)} keyboardType="number-pad"
          onChangeText={(v) => setFormData({ ...formData, quantity: v })} placeholder="10" />
      </Field>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="Pickup Start">
            <TextInput style={styles.input} value={formData.pickupStartTime}
              onChangeText={(v) => setFormData({ ...formData, pickupStartTime: v })} placeholder="17:00" />
          </Field>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Field label="Pickup End">
            <TextInput style={styles.input} value={formData.pickupEndTime}
              onChangeText={(v) => setFormData({ ...formData, pickupEndTime: v })} placeholder="18:00" />
          </Field>
        </View>
      </View>
      <Field label="Category">
        <View style={styles.chipRow}>
          {FOOD_TYPES.map((f) => (
            <TouchableOpacity key={f.value} onPress={() => setFormData({ ...formData, foodType: f.value })}
              style={[styles.chip, formData.foodType === f.value && styles.chipActive]}>
              <Text style={[styles.chipText, formData.foodType === f.value && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>
      <Field label="Taste">
        <View style={styles.chipRow}>
          {TASTES.map((t) => (
            <TouchableOpacity key={t.value} onPress={() => setFormData({ ...formData, taste: t.value })}
              style={[styles.chip, formData.taste === t.value && styles.chipActive]}>
              <Text style={[styles.chipText, formData.taste === t.value && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>
      <Field label="Image">
        {imageUri && <Image source={{ uri: imageUri }} style={styles.imagePreview} />}
        <TouchableOpacity style={styles.imagePicker} onPress={onPickImage}>
          <Ionicons name="camera-outline" size={20} color="#555" />
          <Text style={styles.imagePickerText}>{imageUri ? "Change Image" : "Upload Image"}</Text>
        </TouchableOpacity>
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Create Offer Modal ────────────────────────────────────────────────────────
function CreateOfferModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "", description: "", price: "", originalPrice: "",
    quantity: "", pickupStartTime: "17:00", pickupEndTime: "18:00",
    foodType: "meal", taste: "neutral",
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let images = "[]";
      if (imageUri) {
        const uploadResult = await storageApi.upload([imageUri]);
        if (uploadResult?.length) images = JSON.stringify([uploadResult[0]]);
      }
      const data: any = {
        title: formData.title, description: formData.description,
        price: Math.round(parseFloat(formData.price) * 100),
        quantity: parseInt(formData.quantity),
        expirationDate: new Date(Date.now() + 86400000).toISOString(),
        pickupStartTime: timeToISO(formData.pickupStartTime),
        pickupEndTime: timeToISO(formData.pickupEndTime),
        foodType: formData.foodType, taste: formData.taste, images,
      };
      if (formData.originalPrice) data.originalPrice = Math.round(parseFloat(formData.originalPrice) * 100);
      await offersApi.create(data);
      Toast.show({ type: "success", text1: "Offer published!", text2: "Your offer is now live" });
      onSuccess();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Error", text2: e.message || "Failed to create offer" });
    } finally { setIsLoading(false); }
  };

  return (
    <BottomSheet onClose={onClose}>
      <ModalHeader title="Publish New Offer" subtitle="Create and publish a new food offer" onClose={onClose} />
      <OfferForm formData={formData} setFormData={setFormData} imageUri={imageUri} onPickImage={pickImage} />
      <ModalButtons onCancel={onClose} onSubmit={handleSubmit} isLoading={isLoading}
        submitLabel="Publish Offer" loadingLabel="Publishing..." />
    </BottomSheet>
  );
}

// ─── Edit Offer Modal ──────────────────────────────────────────────────────────
function EditOfferModal({ offer, onClose, onSuccess }: { offer: any; onClose: () => void; onSuccess: () => void }) {
  const product = transformOfferToProduct(offer);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(product.imageUrl || null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: offer.title || product.name || "",
    description: offer.description || "",
    price: ((offer.price || product.price || 0) / 100).toFixed(2),
    originalPrice: ((offer.originalPrice || 0) / 100).toFixed(2),
    quantity: String(offer.quantity || product.quantity || ""),
    pickupStartTime: extractTime(offer.pickupStartTime),
    pickupEndTime: extractTime(offer.pickupEndTime, "18:00"),
    foodType: offer.foodType || "meal",
    taste: offer.taste || "neutral",
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) { setImageUri(result.assets[0].uri); setNewImage(result.assets[0].uri); }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let images = typeof offer.images === "string" ? offer.images : JSON.stringify(offer.images || []);
      if (newImage) {
        const uploadResult = await storageApi.upload([newImage]);
        if (uploadResult?.length) images = JSON.stringify([uploadResult[0]]);
      }
      const data: any = {
        title: formData.title, description: formData.description,
        price: Math.round(parseFloat(formData.price) * 100),
        quantity: parseInt(formData.quantity),
        pickupStartTime: timeToISO(formData.pickupStartTime),
        pickupEndTime: timeToISO(formData.pickupEndTime),
        foodType: formData.foodType, taste: formData.taste, images,
      };
      if (formData.originalPrice) data.originalPrice = Math.round(parseFloat(formData.originalPrice) * 100);
      await offersApi.update(offer.id, data);
      Toast.show({ type: "success", text1: "Offer updated!", text2: "Your changes have been saved" });
      onSuccess();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Error", text2: e.message || "Failed to update offer" });
    } finally { setIsLoading(false); }
  };

  return (
    <BottomSheet onClose={onClose}>
      <ModalHeader title="Edit Offer" onClose={onClose} />
      <OfferForm formData={formData} setFormData={setFormData} imageUri={imageUri} onPickImage={pickImage} />
      <ModalButtons onCancel={onClose} onSubmit={handleSubmit} isLoading={isLoading}
        submitLabel="Save Changes" loadingLabel="Saving..." />
    </BottomSheet>
  );
}

// ─── Order Details Modal ───────────────────────────────────────────────────────
function OrderDetailsModal({ order, onClose, onConfirm }: { order: any; onClose: () => void; onConfirm: (id: number) => void }) {
  const product = order.product || order.offer;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <View style={[sheet.container, { borderRadius: 20, margin: 16 }]}>
          <ModalHeader title="Order Details" onClose={onClose} />
          {product?.imageUrl && <Image source={{ uri: product.imageUrl }} style={styles.imagePreview} />}
          <Text style={styles.orderTitle}>{product?.name || order.offer?.title || "Order"}</Text>
          <Text style={[styles.orderSub, { marginBottom: 16 }]}>{product?.description || order.offer?.description}</Text>
          {[
            ["Quantity", order.quantity],
            ["Price", `$${((order.totalPrice || 0) / 100).toFixed(2)}`],
            ["Status", order.status],
            ["Pickup Code", order.pickupCode || order.id],
            ["Order Date", new Date(order.createdAt).toLocaleDateString()],
          ].map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={styles.detailValue}>{v}</Text>
            </View>
          ))}
          {order.status === "pending" && (
            <TouchableOpacity style={[styles.primaryButton, { marginTop: 16 }]} onPress={() => onConfirm(order.id)}>
              <Text style={styles.primaryButtonText}>Confirm Pickup</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── QR Scanner Modal ─────────────────────────────────────────────────────────
function QRScannerModal({ onClose, onScan }: { onClose: () => void; onScan: (token: string) => void }) {
  const [qrCode, setQrCode] = useState("");
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <View style={[sheet.container, { borderRadius: 20, margin: 16 }]}>
          <ModalHeader title="Scan QR Code" onClose={onClose} />
          <Field label="Enter QR Code Token">
            <TextInput style={[styles.input, { fontFamily: "monospace" }]} value={qrCode}
              onChangeText={setQrCode} placeholder="Scan or enter QR code" autoFocus />
          </Field>
          <Text style={styles.hint}>Enter the pickup code from the customer's order</Text>
          <ModalButtons onCancel={onClose} onSubmit={() => { if (qrCode.trim()) { onScan(qrCode.trim()); onClose(); } }}
            isLoading={false} submitLabel="Scan" loadingLabel="Scanning..." />
        </View>
      </View>
    </Modal>
  );
}

// ─── Profile Edit Modal ────────────────────────────────────────────────────────
function ProfileEditModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "", location: user?.location || "",
    phoneNumber: user?.phoneNumber?.toString() || "", mapsLink: user?.mapsLink || "",
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const update: any = {};
      if (formData.username.trim()) update.username = formData.username.trim();
      if (formData.location.trim()) update.location = formData.location.trim();
      if (formData.phoneNumber.trim()) update.phoneNumber = formData.phoneNumber.trim();
      if (formData.mapsLink.trim()) update.mapsLink = formData.mapsLink.trim();
      await usersApi.updateDetails(update);
      Toast.show({ type: "success", text1: "Profile updated!", text2: "Your business information has been saved" });
      onSuccess();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Error", text2: e.message || "Failed to update profile" });
    } finally { setIsLoading(false); }
  };

  return (
    <BottomSheet onClose={onClose}>
      <ModalHeader title="Edit Business Profile" onClose={onClose} />
      {[
        { label: "Business Name", icon: "person-outline", key: "username", placeholder: "Your business name" },
        { label: "Address", icon: "location-outline", key: "location", placeholder: "123 Main St..." },
        { label: "Phone Number", icon: "call-outline", key: "phoneNumber", placeholder: "+1 (555) 123-4567" },
        { label: "Google Maps Link", icon: "map-outline", key: "mapsLink", placeholder: "https://maps.google.com/..." },
      ].map((f) => (
        <Field key={f.key} label={f.label}>
          <View style={styles.inputWrapper}>
            <Ionicons name={f.icon as any} size={16} color="#888" style={{ marginRight: 8 }} />
            <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={formData[f.key as keyof typeof formData]}
              onChangeText={(v) => setFormData({ ...formData, [f.key]: v })}
              placeholder={f.placeholder} />
          </View>
        </Field>
      ))}
      <ModalButtons onCancel={onClose} onSubmit={handleSubmit} isLoading={isLoading}
        submitLabel="Save Changes" loadingLabel="Saving..." />
    </BottomSheet>
  );
}

// ─── Shared small components ───────────────────────────────────────────────────
function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <View>
        <Text style={styles.modalTitle}>{title}</Text>
        {subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={20} color="#555" />
      </TouchableOpacity>
    </View>
  );
}

function ModalButtons({ onCancel, onSubmit, isLoading, submitLabel, loadingLabel }: {
  onCancel: () => void; onSubmit: () => void;
  isLoading: boolean; submitLabel: string; loadingLabel: string;
}) {
  return (
    <View style={styles.modalButtons}>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.primaryButton, { flex: 1 }, isLoading && { opacity: 0.5 }]}
        onPress={onSubmit} disabled={isLoading}>
        {isLoading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.primaryButtonText}>{submitLabel}</Text>}
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  centeredTitle: { fontSize: 22, fontWeight: "800", color: "#111", textAlign: "center" },
  centeredSubtitle: { fontSize: 14, color: "#888", textAlign: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#111" },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  tab: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 14, fontWeight: "500", color: "#888" },
  tabTextActive: { color: PRIMARY },
  scrollContent: { padding: 16, paddingBottom: 100, gap: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", backgroundColor: "#f9f9f9", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e0e0e0" },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 11, color: "#888" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionCard: { width: "47%", backgroundColor: "#f9f9f9", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e0e0e0", gap: 6 },
  actionLabel: { fontSize: 13, fontWeight: "700", color: "#111" },
  actionSub: { fontSize: 11, color: "#888" },
  orderCard: { backgroundColor: "#f9f9f9", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e0e0e0" },
  orderCardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  orderTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  orderSub: { fontSize: 13, color: "#888", marginTop: 2 },
  orderPrice: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  orderCardButtons: { flexDirection: "row", gap: 8 },
  confirmButton: { flex: 1, backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  confirmButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  viewButton: { paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#e0e0e0", alignItems: "center", justifyContent: "center" },
  mono: { fontFamily: "monospace", fontWeight: "700" },
  viewAll: { color: PRIMARY, fontWeight: "600", textAlign: "center", marginTop: 8 },
  offerCard: { borderRadius: 12, borderWidth: 1, borderColor: "#e0e0e0", overflow: "hidden" },
  offerCardTop: { flexDirection: "row" },
  offerImage: { width: 96, height: 96 },
  offerImagePlaceholder: { backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  offerInfo: { flex: 1, padding: 12, gap: 4 },
  offerTitle: { fontSize: 14, fontWeight: "700", color: "#111" },
  offerSub: { fontSize: 12, color: "#888" },
  offerPrice: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  offerCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#f9f9f9" },
  offerPickup: { fontSize: 12, color: "#888" },
  offerActions: { flexDirection: "row", gap: 8 },
  iconButton: { padding: 6, borderRadius: 8, backgroundColor: "#e0e0e0" },
  emptyBox: { alignItems: "center", padding: 32, borderRadius: 12, borderWidth: 1, borderColor: "#e0e0e0", borderStyle: "dashed", gap: 12 },
  emptyText: { color: "#888", fontSize: 15 },
  skeleton: { height: 128, borderRadius: 12, backgroundColor: "#f0f0f0", marginBottom: 12 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  smallPrimaryButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: PRIMARY, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginLeft: "auto" },
  smallPrimaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#111" },
  modalSubtitle: { fontSize: 13, color: "#888", marginTop: 2 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 8, paddingBottom: 24 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  cancelButton: { flex: 1, borderRadius: 12, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  cancelButtonText: { fontSize: 15, fontWeight: "500", color: "#111" },
  input: { backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111" },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, paddingHorizontal: 14 },
  label: { fontSize: 13, fontWeight: "500", color: "#111", marginBottom: 6 },
  row: { flexDirection: "row" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f0f0f0", borderWidth: 1, borderColor: "#e0e0e0" },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: "500", color: "#555" },
  chipTextActive: { color: "#fff" },
  imagePreview: { width: "100%", height: 160, borderRadius: 12, marginBottom: 8, resizeMode: "cover" },
  imagePicker: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 10, backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0" },
  imagePickerText: { fontSize: 14, color: "#555" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  detailKey: { color: "#888", fontSize: 14 },
  detailValue: { fontWeight: "600", fontSize: 14, color: "#111" },
  hint: { fontSize: 12, color: "#888", marginBottom: 12 },
});

const sheet = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  container: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%", paddingBottom: 0 },
});