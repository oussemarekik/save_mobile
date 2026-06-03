import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offersApi, transformOfferToProduct, storageApi } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "expo-router";

// Lucide icons — swap for your icon library (e.g. react-native-vector-icons)
// Below are minimal SVG-based placeholders; replace as needed.
import {
  Package,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  X,
  Camera,
} from "lucide-react-native"; // or wherever your RN icons come from

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ---------------------------------------------------------------------------
// Theme tokens — mirrors the CSS variables used in the web version
// ---------------------------------------------------------------------------
const theme = {
  background: "#ffffff",
  card: "#f9f9f9",
  secondary: "#f0f0f0",
  border: "#e5e5e5",
  text: "#0f0f0f",
  textMuted: "#666666",
  primary: "#22c55e",
  primaryForeground: "#ffffff",
  muted: "#999999",
  destructive: "#ef4444",
};

// ---------------------------------------------------------------------------
// ProviderOffers (main screen)
// ---------------------------------------------------------------------------
export default function ProviderOffers() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);

  const { data: offers, isLoading } = useQuery({
    queryKey: ["/offers/owner"],
    queryFn: () => offersApi.getByOwner(user?.id || 0),
    enabled: !!user?.id && typeof user.id === "number",
  });

  const deleteOfferMutation = useMutation({
    mutationFn: (id: number) => offersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/offers"] });
      toast({ title: "Offer deleted", description: "Your offer has been removed" });
    },
  });

  const handleDelete = (id: number) => {
    Alert.alert("Delete offer?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteOfferMutation.mutate(id),
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Sign in required</Text>
      </View>
    );
  }

  if (user?.role !== "PROVIDER" && user?.role !== "PENDING_PROVIDER") {
    return (
      <View style={styles.centered}>
        <Package color={theme.muted} size={64} />
        <Text style={[styles.heading, { marginTop: 16 }]}>Provider account required</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/(provider)/dashboard")}
          >
            <ArrowLeft color={theme.text} size={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Offers</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.primary }]}
          onPress={() => setShowCreateForm(true)}
        >
          <Plus color={theme.primaryForeground} size={20} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </>
        ) : offers && offers.length > 0 ? (
          offers.map((offer: any) => {
            const product = transformOfferToProduct(offer);
            return (
              <OfferCard
                key={offer.id}
                offer={offer}
                product={product}
                onEdit={() => setEditingOffer(offer)}
                onDelete={() => handleDelete(offer.id)}
              />
            );
          })
        ) : (
          <EmptyState onCreatePress={() => setShowCreateForm(true)} />
        )}
      </ScrollView>

      {/* Modals */}
      <CreateOfferModal
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false);
          queryClient.invalidateQueries({ queryKey: ["/offers"] });
        }}
      />

      {editingOffer && (
        <EditOfferModal
          visible={!!editingOffer}
          offer={editingOffer}
          onClose={() => setEditingOffer(null)}
          onSuccess={() => {
            setEditingOffer(null);
            queryClient.invalidateQueries({ queryKey: ["/offers"] });
          }}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// OfferCard
// ---------------------------------------------------------------------------
function OfferCard({
  offer,
  product,
  onEdit,
  onDelete,
}: {
  offer: any;
  product: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Image
          source={{ uri: product.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.cardSubtitle}>{product.quantity} available</Text>
          <Text style={styles.cardPrice}>${(product.price / 100).toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText} numberOfLines={1}>
          Pickup: {product.pickupStart} – {product.pickupEnd}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <Edit color={theme.text} size={16} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={onDelete}
          >
            <Trash2 color={theme.destructive} size={16} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
function EmptyState({ onCreatePress }: { onCreatePress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Package color={theme.muted} size={48} />
      <Text style={styles.emptyText}>No offers yet</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onCreatePress}>
        <Plus color={theme.primaryForeground} size={20} />
        <Text style={styles.primaryBtnText}>Publish Your First Offer</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared form field components
// ---------------------------------------------------------------------------
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput style={styles.input} placeholderTextColor={theme.muted} {...props} />;
}

function Picker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}) {
  // Simple scrollable option list rendered inline; swap for @react-native-picker/picker if preferred
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.pickerRow}
    >
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.pickerOption,
            value === opt.value && styles.pickerOptionActive,
          ]}
          onPress={() => onChange(opt.value)}
        >
          <Text
            style={[
              styles.pickerOptionText,
              value === opt.value && styles.pickerOptionTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Shared BottomSheet wrapper with slide-up animation
// ---------------------------------------------------------------------------
function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 150,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// CreateOfferModal
// ---------------------------------------------------------------------------
function CreateOfferModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    originalPrice: "",
    quantity: "",
    pickupStartTime: "17:00",
    pickupEndTime: "18:00",
    foodType: "meal",
    taste: "neutral",
  });

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const pickImage = async () => {
    // Use expo-image-picker or react-native-image-picker in your project
    // Example with expo-image-picker:
    // const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    // if (!result.canceled) { setImageUri(result.assets[0].uri); setSelectedImage(result.assets[0]); }
    Alert.alert("Image picker", "Integrate your image picker library here.");
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let images = "[]";
      if (selectedImage) {
        setUploadingImage(true);
        const uploadResult = await storageApi.upload([selectedImage]);
        if (uploadResult?.length > 0) images = JSON.stringify([uploadResult[0]]);
        setUploadingImage(false);
      }

      const parseTime = (t: string) => {
        const parts = t.split(":");
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        return isNaN(h) || isNaN(m) ? { hours: 17, minutes: 0 } : { hours: h, minutes: m };
      };

      const today = new Date();
      const start = parseTime(form.pickupStartTime);
      const end = parseTime(form.pickupEndTime);
      const pickupStartDateTime = new Date(today);
      pickupStartDateTime.setHours(start.hours, start.minutes, 0, 0);
      const pickupEndDateTime = new Date(today);
      pickupEndDateTime.setHours(end.hours, end.minutes, 0, 0);

      const createData: any = {
        title: form.title,
        description: form.description,
        price: Math.round(parseFloat(form.price) * 100),
        quantity: parseInt(form.quantity),
        expirationDate: new Date(Date.now() + 86400000).toISOString(),
        pickupStartTime: pickupStartDateTime.toISOString(),
        pickupEndTime: pickupEndDateTime.toISOString(),
        foodType: form.foodType,
        taste: form.taste,
        images,
      };
      if (form.originalPrice) {
        createData.originalPrice = Math.round(parseFloat(form.originalPrice) * 100);
      }

      await offersApi.create(createData);
      toast({ title: "Offer published!", description: "Your offer is now live" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create offer" });
    } finally {
      setIsLoading(false);
      setUploadingImage(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Publish New Offer</Text>
              <Text style={styles.sheetSubtitle}>Create and publish a new food offer</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
              <X color={theme.text} size={20} />
            </TouchableOpacity>
          </View>

          <Field label="Title">
            <Input value={form.title} onChangeText={set("title")} placeholder="Magic Bag" />
          </Field>

          <Field label="Description">
            <TextInput
              style={[styles.input, { height: 88, textAlignVertical: "top" }]}
              value={form.description}
              onChangeText={set("description")}
              placeholder="Mixed pastries, sandwiches, and more..."
              placeholderTextColor={theme.muted}
              multiline
              numberOfLines={3}
            />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Price ($)">
                <Input
                  value={form.price}
                  onChangeText={set("price")}
                  placeholder="4.99"
                  keyboardType="decimal-pad"
                />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Original Price ($)">
                <Input
                  value={form.originalPrice}
                  onChangeText={set("originalPrice")}
                  placeholder="15.99"
                  keyboardType="decimal-pad"
                />
              </Field>
            </View>
          </View>

          <Field label="Quantity">
            <Input
              value={form.quantity}
              onChangeText={set("quantity")}
              placeholder="10"
              keyboardType="number-pad"
            />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Pickup Start">
                <Input
                  value={form.pickupStartTime}
                  onChangeText={set("pickupStartTime")}
                  placeholder="17:00"
                  keyboardType="numbers-and-punctuation"
                />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Pickup End">
                <Input
                  value={form.pickupEndTime}
                  onChangeText={set("pickupEndTime")}
                  placeholder="18:00"
                  keyboardType="numbers-and-punctuation"
                />
              </Field>
            </View>
          </View>

          <Field label="Category">
            <Picker
              value={form.foodType}
              onChange={set("foodType")}
              options={[
                { label: "Meals", value: "meal" },
                { label: "Bread & Pastries", value: "snack" },
                { label: "Beverages", value: "beverage" },
                { label: "Other", value: "other" },
              ]}
            />
          </Field>

          <Field label="Taste">
            <Picker
              value={form.taste}
              onChange={set("taste")}
              options={[
                { label: "Neutral", value: "neutral" },
                { label: "Sweet", value: "sweet" },
                { label: "Salty", value: "salty" },
                { label: "Both", value: "both" },
              ]}
            />
          </Field>

          <Field label="Image">
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            )}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              <Camera color={theme.text} size={20} />
              <Text style={styles.imagePickerText}>
                {imageUri ? "Change Image" : "Upload Image"}
              </Text>
            </TouchableOpacity>
          </Field>

          <View style={[styles.row, { marginTop: 24 }]}>
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity
              style={[styles.btnPrimary, { flex: 1 }, (isLoading || uploadingImage) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isLoading || uploadingImage}
            >
              {isLoading || uploadingImage ? (
                <ActivityIndicator color={theme.primaryForeground} size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Publish Offer</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// EditOfferModal
// ---------------------------------------------------------------------------
function EditOfferModal({
  visible,
  offer,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  offer: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const product = transformOfferToProduct(offer);

  const extractTime = (dt: string | Date | null | undefined, def: string): string => {
    if (!dt) return def;
    try {
      const d = typeof dt === "string" ? new Date(dt) : dt;
      if (isNaN(d.getTime())) return def;
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return def;
    }
  };

  const [form, setForm] = useState({
    title: offer.title || product.name || "",
    description: offer.description || "",
    price: ((offer.price || product.price || 0) / 100).toFixed(2),
    originalPrice: ((offer.originalPrice || product.originalPrice || 0) / 100).toFixed(2),
    quantity: String(offer.quantity || product.quantity || ""),
    pickupStartTime: extractTime(offer.pickupStartTime, "17:00"),
    pickupEndTime: extractTime(offer.pickupEndTime, "18:00"),
    foodType: offer.foodType || "meal",
    taste: offer.taste || "neutral",
  });

  useEffect(() => {
    if (product.imageUrl) setImageUri(product.imageUrl);
  }, [product.imageUrl]);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const pickImage = async () => {
    Alert.alert("Image picker", "Integrate your image picker library here.");
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let imagesToSend = "[]";
      if (selectedImage) {
        setUploadingImage(true);
        const res = await storageApi.upload([selectedImage]);
        if (res?.length > 0) imagesToSend = JSON.stringify([res[0]]);
        setUploadingImage(false);
      } else if (offer.images) {
        imagesToSend = typeof offer.images === "string" ? offer.images : JSON.stringify(offer.images);
      }

      const parseTime = (t: string) => {
        const parts = t.split(":");
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        return isNaN(h) || isNaN(m) ? { hours: 17, minutes: 0 } : { hours: h, minutes: m };
      };

      const today = new Date();
      const start = parseTime(form.pickupStartTime);
      const end = parseTime(form.pickupEndTime);
      const pickupStartDateTime = new Date(today);
      pickupStartDateTime.setHours(start.hours, start.minutes, 0, 0);
      const pickupEndDateTime = new Date(today);
      pickupEndDateTime.setHours(end.hours, end.minutes, 0, 0);

      const updateData: any = {
        title: form.title,
        description: form.description,
        price: Math.round(parseFloat(form.price) * 100),
        quantity: parseInt(form.quantity),
        pickupStartTime: pickupStartDateTime.toISOString(),
        pickupEndTime: pickupEndDateTime.toISOString(),
        foodType: form.foodType,
        taste: form.taste,
        images: imagesToSend,
      };
      if (form.originalPrice) {
        updateData.originalPrice = Math.round(parseFloat(form.originalPrice) * 100);
      }

      await offersApi.update(offer.id, updateData);
      toast({ title: "Offer updated!", description: "Your changes have been saved" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update offer" });
    } finally {
      setIsLoading(false);
      setUploadingImage(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit Offer</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
              <X color={theme.text} size={20} />
            </TouchableOpacity>
          </View>

          <Field label="Title">
            <Input value={form.title} onChangeText={set("title")} />
          </Field>

          <Field label="Description">
            <TextInput
              style={[styles.input, { height: 88, textAlignVertical: "top" }]}
              value={form.description}
              onChangeText={set("description")}
              placeholderTextColor={theme.muted}
              multiline
              numberOfLines={3}
            />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Price ($)">
                <Input value={form.price} onChangeText={set("price")} keyboardType="decimal-pad" />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Original Price ($)">
                <Input
                  value={form.originalPrice}
                  onChangeText={set("originalPrice")}
                  keyboardType="decimal-pad"
                />
              </Field>
            </View>
          </View>

          <Field label="Quantity">
            <Input value={form.quantity} onChangeText={set("quantity")} keyboardType="number-pad" />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Pickup Start">
                <Input
                  value={form.pickupStartTime}
                  onChangeText={set("pickupStartTime")}
                  keyboardType="numbers-and-punctuation"
                />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Pickup End">
                <Input
                  value={form.pickupEndTime}
                  onChangeText={set("pickupEndTime")}
                  keyboardType="numbers-and-punctuation"
                />
              </Field>
            </View>
          </View>

          <Field label="Category">
            <Picker
              value={form.foodType}
              onChange={set("foodType")}
              options={[
                { label: "Meals", value: "meal" },
                { label: "Bread & Pastries", value: "snack" },
                { label: "Beverages", value: "beverage" },
                { label: "Other", value: "other" },
              ]}
            />
          </Field>

          <Field label="Taste">
            <Picker
              value={form.taste}
              onChange={set("taste")}
              options={[
                { label: "Neutral", value: "neutral" },
                { label: "Sweet", value: "sweet" },
                { label: "Salty", value: "salty" },
                { label: "Both", value: "both" },
              ]}
            />
          </Field>

          <Field label="Image">
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            )}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              <Camera color={theme.text} size={20} />
              <Text style={styles.imagePickerText}>
                {selectedImage ? "Change Image" : "Update Image"}
              </Text>
            </TouchableOpacity>
          </Field>

          <View style={[styles.row, { marginTop: 24 }]}>
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity
              style={[styles.btnPrimary, { flex: 1 }, (isLoading || uploadingImage) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isLoading || uploadingImage}
            >
              {isLoading || uploadingImage ? (
                <ActivityIndicator color={theme.primaryForeground} size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Layout
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 16,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Typography
  heading: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    height: 128,
    opacity: 0.5,
    marginBottom: 12,
  },

  // Offer card
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    height: 96,
  },
  cardImage: {
    width: 96,
    height: 96,
    backgroundColor: theme.secondary,
  },
  cardInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: theme.textMuted,
    fontSize: 12,
  },
  cardPrice: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: `${theme.secondary}99`,
  },
  cardFooterText: {
    color: theme.textMuted,
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.secondary,
  },
  deleteBtn: {
    backgroundColor: `${theme.destructive}18`,
  },

  // Empty state
  emptyState: {
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
  },

  // Buttons
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.primary,
  },
  primaryBtnText: {
    color: theme.primaryForeground,
    fontWeight: "700",
    fontSize: 15,
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: theme.primaryForeground,
    fontWeight: "700",
    fontSize: 15,
  },
  btnSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.secondary,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    color: theme.text,
    fontWeight: "500",
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Bottom sheet
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.92,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  sheetTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    color: theme.textMuted,
    fontSize: 13,
    marginTop: 4,
  },

  // Form
  field: {
    marginBottom: 16,
  },
  label: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.secondary,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.text,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  // Picker chips
  pickerRow: {
    flexDirection: "row",
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.secondary,
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: 8,
  },
  pickerOptionActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  pickerOptionText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  pickerOptionTextActive: {
    color: theme.primaryForeground,
  },

  // Image
  imagePreview: {
    width: "100%",
    height: 128,
    borderRadius: 14,
    marginBottom: 8,
  },
  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.secondary,
    borderWidth: 1,
    borderColor: theme.border,
  },
  imagePickerText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "500",
  },
});