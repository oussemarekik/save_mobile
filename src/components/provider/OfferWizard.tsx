import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/context/LanguageContext";
import { offersApi, storageApi, transformOfferToProduct } from "@/lib/api-client";
import { invalidateOfferQueries } from "@/lib/offer-queries";
import { pickImageFromLibrary, type PickedImage } from "@/lib/pick-image";
import { pickupDayLabel } from "@/lib/pickup-labels";
import { safeGoBack } from "@/lib/navigation";
import { theme } from "@/lib/theme";
import { CURRENCY_UNIT, formatPrice } from "@/utils/formatPrice";
import { sanitizeErrorMessage } from "@/utils/errorUtils";
import {
  customerPriceFor,
  providerPriceFrom,
  parseAmount,
  discountPercent,
  isOfferExpired,
  parseTimeText,
  normalizeTimeText,
  shiftTimeText,
  timeTextOf,
  dayOffsetOf,
  pickupWindowFor,
  nextPickupSlot,
  type PickupSlot,
} from "@/utils/offerUtils";

const GREEN = theme.primaryDark;
const CREAM = theme.backgroundGradient;
const MUTED = theme.muted;
const LINE = theme.primaryBorder;
const SOFT_GREEN = theme.primaryBg;
const PLACEHOLDER = theme.mutedForeground;

/** create: new offer · edit: change an existing one · relaunch: put an ended one back on sale */
export type OfferWizardMode = "create" | "edit" | "relaunch";

type StepId = "what" | "price" | "when" | "review";
type Category = "meal" | "snack" | "beverage" | "other";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const CATEGORIES: { value: Category; icon: IconName }[] = [
  { value: "meal", icon: "restaurant-outline" },
  { value: "snack", icon: "cafe-outline" },
  { value: "beverage", icon: "wine-outline" },
  { value: "other", icon: "cube-outline" },
];

/** Ready-made prices at a third of the basket's value */
const SIZE_PRESETS = [
  { key: "small", price: 5, originalPrice: 15 },
  { key: "medium", price: 7, originalPrice: 21 },
  { key: "large", price: 10, originalPrice: 30 },
] as const;

const DAY_CHOICES = 7;
const TIME_STEP_MINUTES = 30;
const MAX_QUANTITY = 99;

type OfferForm = {
  category: Category;
  name: string;
  description: string;
  originalPrice: string;
  price: string;
  slot: PickupSlot;
  quantity: number;
};

/** The offer's own slot while it is still ahead of us, otherwise the next one at the same hours. */
function slotOf(offer: any): PickupSlot {
  const start = offer.pickupStartTime ? new Date(offer.pickupStartTime) : null;
  const end = offer.pickupEndTime ? new Date(offer.pickupEndTime) : null;
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return nextPickupSlot();

  const times = { startTime: timeTextOf(start), endTime: timeTextOf(end) };
  const dayOffset = dayOffsetOf(start);
  const isAhead = !isOfferExpired(offer.expirationDate) && dayOffset >= 0 && dayOffset < DAY_CHOICES;
  return isAhead ? { dayOffset, ...times } : nextPickupSlot(times);
}

function initialForm(offer: any | undefined, mode: OfferWizardMode, defaultName: string): OfferForm {
  if (!offer) {
    return {
      category: "meal",
      name: defaultName,
      description: "",
      originalPrice: "",
      price: "",
      slot: nextPickupSlot(),
      quantity: 3,
    };
  }
  const quantity = offer.quantity ?? 0;
  return {
    category: CATEGORIES.some((c) => c.value === offer.foodType) ? offer.foodType : "other",
    name: offer.title || "",
    description: offer.description || "",
    originalPrice: offer.originalPrice ? String(offer.originalPrice) : "",
    price: offer.price ? String(providerPriceFrom(offer.price)) : "",
    slot: slotOf(offer),
    quantity: mode === "relaunch" ? Math.max(quantity, 1) : quantity,
  };
}

export function OfferWizard({ mode, offer }: { mode: OfferWizardMode; offer?: any }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const steps: StepId[] = mode === "relaunch" ? ["when"] : ["what", "price", "when", "review"];
  // Starting values are read once, so a background refetch does not reset the form
  const [initial] = useState(() => initialForm(offer, mode, t("provider_offers.default_name_meal")));

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<OfferForm>(initial);
  const [nameEdited, setNameEdited] = useState(mode !== "create");
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [scheduleTouched, setScheduleTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const wasExpired = !!offer && isOfferExpired(offer.expirationDate);
  // An untouched slot of a running offer is left exactly as it is
  const sendsSchedule = mode !== "edit" || scheduleTouched || wasExpired;
  const minQuantity = mode === "edit" ? 0 : 1;

  const existingImage =
    offer && Array.isArray(offer.images) && offer.images.length > 0
      ? (transformOfferToProduct(offer).imageUrl as string)
      : null;
  const imageUri = photo?.uri ?? existingImage;

  const providerPrice = parseAmount(form.price);
  const priceUnchanged = !!offer && form.price === initial.price;
  const customerPrice =
    providerPrice === null ? null : priceUnchanged ? (offer.price as number) : customerPriceFor(providerPrice);
  const originalPrice = form.originalPrice.trim() ? parseAmount(form.originalPrice) : null;
  const discount = customerPrice === null ? null : discountPercent(customerPrice, originalPrice);

  const update = (changes: Partial<OfferForm>) => {
    setForm((current) => ({ ...current, ...changes }));
    setError(null);
  };

  const updateSlot = (changes: Partial<PickupSlot>) => {
    setForm((current) => ({ ...current, slot: { ...current.slot, ...changes } }));
    setScheduleTouched(true);
    setError(null);
  };

  const selectCategory = (category: Category) => {
    update(nameEdited ? { category } : { category, name: t(`provider_offers.default_name_${category}`) });
  };

  const stepStartTime = (delta: number) => {
    const startTime = shiftTimeText(form.slot.startTime, delta, initial.slot.startTime);
    const start = parseTimeText(startTime) ?? 0;
    const end = parseTimeText(form.slot.endTime);
    // Keep the window open: the end follows when the start catches up with it
    const endTime = end !== null && end > start ? form.slot.endTime : shiftTimeText(startTime, 60, startTime);
    updateSlot({ startTime, endTime });
  };

  const pickPhoto = async () => {
    const picked = await pickImageFromLibrary();
    if (picked) setPhoto(picked);
  };

  const validate = (id: StepId): string | null => {
    if (id === "what") {
      return form.name.trim().length < 3 ? t("provider_offers.error_name") : null;
    }
    if (id === "price") {
      if (providerPrice === null || customerPrice === null) return t("provider_offers.error_price");
      if (form.originalPrice.trim() && (originalPrice === null || originalPrice <= customerPrice)) {
        return t("provider_offers.error_original_price", { price: formatPrice(customerPrice) });
      }
      return null;
    }
    if (id === "when") {
      const window = pickupWindowFor(form.slot);
      if (!window) return t("provider_offers.error_time_format");
      if (window.end.getTime() <= window.start.getTime()) return t("provider_offers.error_time_order");
      if (sendsSchedule && window.end.getTime() <= Date.now()) return t("provider_offers.error_time_past");
      return null;
    }
    return null;
  };

  const submit = async () => {
    const window = pickupWindowFor(form.slot);
    if (!window) return;
    const schedule = {
      pickupStartTime: window.start.toISOString(),
      pickupEndTime: window.end.toISOString(),
      // The offer leaves the client app when its pickup window closes
      expirationDate: window.end.toISOString(),
    };

    setSubmitting(true);
    setError(null);
    try {
      if (mode === "relaunch") {
        await offersApi.update(offer.id, { ...schedule, quantity: form.quantity });
      } else {
        if (providerPrice === null || customerPrice === null) return;
        const uploaded = photo ? await storageApi.upload([photo]) : [];
        const images = uploaded.length > 0 ? JSON.stringify([uploaded[0]]) : undefined;
        const details = {
          title: form.name.trim(),
          description: form.description.trim(),
          foodType: form.category,
        };

        if (mode === "create") {
          await offersApi.create({
            ...details,
            ...schedule,
            // The API adds the commission to the provider's price itself
            price: providerPrice,
            ...(originalPrice !== null ? { originalPrice } : {}),
            quantity: form.quantity,
            images: images ?? "[]",
          });
        } else {
          await offersApi.update(offer.id, {
            ...details,
            ...(sendsSchedule ? schedule : {}),
            // Updates store the price as sent, so it goes out with the commission included
            ...(priceUnchanged ? {} : { price: customerPrice }),
            ...(form.originalPrice === initial.originalPrice ? {} : { originalPrice }),
            // Sent only when edited, so a sale made meanwhile is not overwritten
            ...(form.quantity === initial.quantity ? {} : { quantity: form.quantity }),
            ...(images ? { images } : {}),
          });
        }
      }

      await invalidateOfferQueries(queryClient);
      Toast.show({
        type: "success",
        text1: t(`provider_offers.${mode}_success_title`),
        text2: t(`provider_offers.${mode}_success_desc`),
      });
      // Back to the dashboard already open underneath, on its offers tab
      router.dismissTo({ pathname: "/(provider)/dashboard", params: { tab: "offers" } } as any);
    } catch (err: unknown) {
      setError(sanitizeErrorMessage(err, { defaultMessage: t("provider_offers.save_failed") }));
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    const problem = validate(step);
    if (problem) {
      setError(problem);
      return;
    }
    if (isLastStep) {
      submit();
      return;
    }
    setError(null);
    setStepIndex(stepIndex + 1);
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setError(null);
      setStepIndex(stepIndex - 1);
      return;
    }
    safeGoBack(router, "/(provider)/dashboard");
  };

  const primaryLabel = !isLastStep
    ? t("common.continue")
    : mode === "create"
      ? t("provider_offers.publish")
      : mode === "relaunch"
        ? t("provider_offers.relaunch")
        : t("provider_offers.save");

  const dayLabel = pickupDayLabel(form.slot.dayOffset, t, language);
  const windowLabel = `${dayLabel} · ${normalizeTimeText(form.slot.startTime)} – ${normalizeTimeText(form.slot.endTime)}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.navBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t("common.back") || "Back"}
        >
          <Ionicons name={stepIndex > 0 ? "chevron-back" : "close"} size={28} color={GREEN} />
        </TouchableOpacity>
        <View style={styles.navText}>
          <Text style={styles.navTitle}>{t(`provider_offers.${mode}_title`)}</Text>
          {steps.length > 1 ? (
            <Text style={styles.navStep}>
              {t("provider_offers.step", { current: stepIndex + 1, total: steps.length })}
            </Text>
          ) : null}
        </View>
      </View>

      {steps.length > 1 ? (
        <View style={styles.progress}>
          {steps.map((id, index) => (
            <View key={id} style={[styles.progressSegment, index <= stepIndex && styles.progressSegmentDone]} />
          ))}
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "what" && (
            <>
              <Text style={styles.headline}>{t("provider_offers.what_title")}</Text>
              <Text style={styles.helper}>{t("provider_offers.what_helper")}</Text>

              <View style={styles.categoryGrid}>
                {CATEGORIES.map((category) => {
                  const selected = form.category === category.value;
                  return (
                    <TouchableOpacity
                      key={category.value}
                      style={[styles.categoryCard, selected && styles.cardSelected]}
                      onPress={() => selectCategory(category.value)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Ionicons name={category.icon} size={26} color={GREEN} />
                      <Text style={styles.categoryLabel}>{t(`offers.food_type_${category.value}`)}</Text>
                      <Text style={styles.categoryHint}>{t(`provider_offers.category_hint_${category.value}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>{t("provider_offers.name_label")}</Text>
              <TextInput
                style={styles.underlineInput}
                value={form.name}
                onChangeText={(name) => {
                  setNameEdited(true);
                  update({ name });
                }}
                maxLength={60}
                placeholderTextColor={PLACEHOLDER}
              />

              <Text style={styles.fieldLabel}>{t("provider_offers.description_label")}</Text>
              <TextInput
                style={[styles.underlineInput, styles.multiline]}
                value={form.description}
                onChangeText={(description) => update({ description })}
                placeholder={t("provider_offers.description_placeholder")}
                placeholderTextColor={PLACEHOLDER}
                multiline
                maxLength={300}
              />

              <TouchableOpacity style={styles.photoRow} onPress={pickPhoto} activeOpacity={0.85}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.photoThumb} />
                ) : (
                  <View style={[styles.photoThumb, styles.photoPlaceholder]}>
                    <Ionicons name="camera-outline" size={24} color={GREEN} />
                  </View>
                )}
                <Text style={styles.photoText}>
                  {imageUri ? t("provider_offers.photo_change") : t("provider_offers.photo_add")}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={MUTED} />
              </TouchableOpacity>
            </>
          )}

          {step === "price" && (
            <>
              <Text style={styles.headline}>{t("provider_offers.price_title")}</Text>
              <Text style={styles.helper}>{t("provider_offers.price_helper")}</Text>

              <View style={styles.presetRow}>
                {SIZE_PRESETS.map((preset) => {
                  const selected =
                    providerPrice === preset.price && originalPrice === preset.originalPrice;
                  return (
                    <TouchableOpacity
                      key={preset.key}
                      style={[styles.presetCard, selected && styles.cardSelected]}
                      onPress={() =>
                        update({ price: String(preset.price), originalPrice: String(preset.originalPrice) })
                      }
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={styles.presetLabel}>{t(`provider_offers.size_${preset.key}`)}</Text>
                      <Text style={styles.presetPrice}>{formatPrice(preset.price)}</Text>
                      <Text style={styles.presetValue}>
                        {t("provider_offers.size_value", { value: preset.originalPrice })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.priceRow}>
                <AmountField
                  label={t("provider_offers.original_price_label")}
                  value={form.originalPrice}
                  onChangeText={(value) => update({ originalPrice: value })}
                  placeholder="15"
                />
                <AmountField
                  label={t("provider_offers.price_label")}
                  value={form.price}
                  onChangeText={(value) => update({ price: value })}
                  placeholder="5"
                />
              </View>

              {customerPrice !== null ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>{t("provider_offers.customer_price")}</Text>
                  <View style={styles.summaryPriceRow}>
                    <Text style={styles.summaryPrice}>{formatPrice(customerPrice)}</Text>
                    {discount !== null && originalPrice !== null ? (
                      <>
                        <Text style={styles.summaryOriginal}>{formatPrice(originalPrice)}</Text>
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>−{discount} %</Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                  <Text style={styles.summaryNote}>{t("provider_offers.customer_price_note")}</Text>
                </View>
              ) : null}
            </>
          )}

          {step === "when" && (
            <>
              <Text style={styles.headline}>
                {t(mode === "relaunch" ? "provider_offers.relaunch_when_title" : "provider_offers.when_title")}
              </Text>
              <Text style={styles.helper}>
                {mode === "relaunch"
                  ? offer.title
                  : user?.location
                    ? t("provider_offers.when_helper", { location: user.location })
                    : t("provider_offers.when_helper_no_location")}
              </Text>

              {mode === "edit" && wasExpired ? (
                <View style={styles.notice}>
                  <Ionicons name="time-outline" size={18} color={GREEN} />
                  <Text style={styles.noticeText}>{t("provider_offers.expired_notice")}</Text>
                </View>
              ) : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dayScroll}
                contentContainerStyle={styles.dayRow}
              >
                {Array.from({ length: DAY_CHOICES }, (_, dayOffset) => {
                  const selected = form.slot.dayOffset === dayOffset;
                  return (
                    <TouchableOpacity
                      key={dayOffset}
                      style={[styles.dayChip, selected && styles.dayChipSelected]}
                      onPress={() => updateSlot({ dayOffset })}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                        {pickupDayLabel(dayOffset, t, language)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.settingsCard}>
                <SettingRow label={t("provider_offers.from")}>
                  <Stepper
                    onDecrease={() => stepStartTime(-TIME_STEP_MINUTES)}
                    onIncrease={() => stepStartTime(TIME_STEP_MINUTES)}
                    decreaseLabel={t("provider_offers.earlier")}
                    increaseLabel={t("provider_offers.later")}
                  >
                    <TextInput
                      style={styles.stepperInput}
                      value={form.slot.startTime}
                      onChangeText={(startTime) => updateSlot({ startTime })}
                      onBlur={() => updateSlot({ startTime: normalizeTimeText(form.slot.startTime) })}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      selectTextOnFocus
                      accessibilityLabel={t("provider_offers.from")}
                    />
                  </Stepper>
                </SettingRow>
                <SettingRow label={t("provider_offers.to")}>
                  <Stepper
                    onDecrease={() =>
                      updateSlot({ endTime: shiftTimeText(form.slot.endTime, -TIME_STEP_MINUTES, initial.slot.endTime) })
                    }
                    onIncrease={() =>
                      updateSlot({ endTime: shiftTimeText(form.slot.endTime, TIME_STEP_MINUTES, initial.slot.endTime) })
                    }
                    decreaseLabel={t("provider_offers.earlier")}
                    increaseLabel={t("provider_offers.later")}
                  >
                    <TextInput
                      style={styles.stepperInput}
                      value={form.slot.endTime}
                      onChangeText={(endTime) => updateSlot({ endTime })}
                      onBlur={() => updateSlot({ endTime: normalizeTimeText(form.slot.endTime) })}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      selectTextOnFocus
                      accessibilityLabel={t("provider_offers.to")}
                    />
                  </Stepper>
                </SettingRow>
                <SettingRow label={t("provider_offers.quantity_label")} last>
                  <Stepper
                    onDecrease={() => update({ quantity: Math.max(form.quantity - 1, minQuantity) })}
                    onIncrease={() => update({ quantity: Math.min(form.quantity + 1, MAX_QUANTITY) })}
                    decreaseDisabled={form.quantity <= minQuantity}
                    increaseDisabled={form.quantity >= MAX_QUANTITY}
                    decreaseLabel={t("provider_offers.decrease")}
                    increaseLabel={t("provider_offers.increase")}
                  >
                    <Text style={styles.stepperValue}>{form.quantity}</Text>
                  </Stepper>
                </SettingRow>
              </View>
            </>
          )}

          {step === "review" && (
            <>
              <Text style={styles.headline}>{t("provider_offers.review_title")}</Text>
              <Text style={styles.helper}>{t("provider_offers.review_helper")}</Text>

              <View style={styles.reviewCard}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.reviewImage} />
                ) : (
                  <View style={[styles.reviewImage, styles.photoPlaceholder]}>
                    <Ionicons name="bag-handle-outline" size={40} color={GREEN} />
                  </View>
                )}
                <View style={styles.reviewBody}>
                  <Text style={styles.reviewCategory}>{t(`offers.food_type_${form.category}`)}</Text>
                  <Text style={styles.reviewName}>{form.name.trim()}</Text>
                  {form.description.trim() ? (
                    <Text style={styles.reviewDescription}>{form.description.trim()}</Text>
                  ) : null}

                  <ReviewRow icon="time-outline" text={windowLabel} />
                  {user?.location ? <ReviewRow icon="location-outline" text={user.location} /> : null}
                  <ReviewRow
                    icon="bag-handle-outline"
                    text={t(
                      form.quantity === 1 ? "provider_offers.quantity_one" : "provider_offers.quantity_many",
                      { count: form.quantity }
                    )}
                  />

                  {customerPrice !== null ? (
                    <View style={[styles.summaryPriceRow, styles.reviewPriceRow]}>
                      <Text style={styles.summaryPrice}>{formatPrice(customerPrice)}</Text>
                      {discount !== null && originalPrice !== null ? (
                        <>
                          <Text style={styles.summaryOriginal}>{formatPrice(originalPrice)}</Text>
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>−{discount} %</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.pill, submitting && styles.pillDisabled]}
            onPress={goNext}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.pillText}>{primaryLabel}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function AmountField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.amountField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.amountInputWrap}>
        <TextInput
          style={styles.amountInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER}
          keyboardType="decimal-pad"
          maxLength={7}
          accessibilityLabel={label}
        />
        <Text style={styles.amountUnit}>{CURRENCY_UNIT}</Text>
      </View>
    </View>
  );
}

function SettingRow({ label, last, children }: { label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.settingRow, last && styles.settingRowLast]}>
      <Text style={styles.settingLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Stepper({
  onDecrease,
  onIncrease,
  decreaseDisabled,
  increaseDisabled,
  decreaseLabel,
  increaseLabel,
  children,
}: {
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  decreaseLabel: string;
  increaseLabel: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={[styles.stepperButton, decreaseDisabled && styles.stepperButtonDisabled]}
        onPress={onDecrease}
        disabled={decreaseDisabled}
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
      >
        <Ionicons name="remove" size={20} color={GREEN} />
      </TouchableOpacity>
      {children}
      <TouchableOpacity
        style={[styles.stepperButton, increaseDisabled && styles.stepperButtonDisabled]}
        onPress={onIncrease}
        disabled={increaseDisabled}
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
      >
        <Ionicons name="add" size={20} color={GREEN} />
      </TouchableOpacity>
    </View>
  );
}

function ReviewRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.reviewRow}>
      <Ionicons name={icon} size={18} color={MUTED} />
      <Text style={styles.reviewRowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  flex: { flex: 1 },

  nav: { height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 4 },
  navBack: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  navText: { flex: 1 },
  navTitle: { fontSize: 16, fontWeight: "700", color: GREEN },
  navStep: { fontSize: 13, color: MUTED, marginTop: 1 },

  progress: { flexDirection: "row", gap: 6, paddingHorizontal: 24, marginTop: 4 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: LINE },
  progressSegmentDone: { backgroundColor: GREEN },

  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  headline: {
    fontSize: 30,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: 8,
  },
  helper: { fontSize: 16, lineHeight: 22, color: MUTED, marginBottom: 24 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: MUTED,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  categoryCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 14,
    gap: 4,
  },
  cardSelected: { borderColor: GREEN, backgroundColor: SOFT_GREEN },
  categoryLabel: { fontSize: 16, fontWeight: "700", color: GREEN, marginTop: 4 },
  categoryHint: { fontSize: 13, lineHeight: 17, color: MUTED },

  underlineInput: {
    fontSize: 18,
    color: GREEN,
    borderBottomWidth: 2,
    borderBottomColor: LINE,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    paddingHorizontal: 0,
    marginBottom: 22,
  },
  multiline: { minHeight: 64, textAlignVertical: "top", fontSize: 16, lineHeight: 22 },

  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
  },
  photoThumb: { width: 56, height: 56, borderRadius: 12 },
  photoPlaceholder: { backgroundColor: SOFT_GREEN, alignItems: "center", justifyContent: "center" },
  photoText: { flex: 1, fontSize: 16, fontWeight: "600", color: GREEN },

  presetRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  presetCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  presetLabel: { fontSize: 13, fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: 0.4 },
  presetPrice: { fontSize: 20, fontWeight: "800", color: GREEN },
  presetValue: { fontSize: 12, color: MUTED, textAlign: "center" },

  priceRow: { flexDirection: "row", gap: 20 },
  amountField: { flex: 1 },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: LINE,
    marginBottom: 22,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 24,
    fontWeight: "700",
    color: GREEN,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: 0,
  },
  amountUnit: { fontSize: 18, fontWeight: "600", color: MUTED, marginLeft: 6 },

  summaryCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  summaryLabel: { fontSize: 14, color: MUTED },
  summaryPriceRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 4 },
  summaryPrice: { fontSize: 26, fontWeight: "800", color: GREEN },
  summaryOriginal: { fontSize: 16, color: MUTED, textDecorationLine: "line-through" },
  summaryNote: { fontSize: 13, color: MUTED, marginTop: 6 },
  discountBadge: { backgroundColor: GREEN, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  discountText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: SOFT_GREEN,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20, color: GREEN },

  // Chips scroll to the screen edge, past the page padding
  dayScroll: { marginHorizontal: -24, marginBottom: 20, flexGrow: 0 },
  dayRow: { paddingHorizontal: 24, gap: 8 },
  dayChip: {
    paddingHorizontal: 16,
    height: 44,
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: LINE,
  },
  dayChipSelected: { backgroundColor: GREEN, borderColor: GREEN },
  dayChipText: { fontSize: 15, fontWeight: "600", color: GREEN },
  dayChipTextSelected: { color: "#fff" },

  settingsCard: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 16 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingRowLast: { borderBottomWidth: 0 },
  settingLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: GREEN },

  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SOFT_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDisabled: { opacity: 0.4 },
  stepperInput: {
    width: 72,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: GREEN,
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  stepperValue: { width: 72, textAlign: "center", fontSize: 20, fontWeight: "700", color: GREEN },

  reviewCard: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden" },
  reviewImage: { width: "100%", height: 150 },
  reviewBody: { padding: 16 },
  reviewCategory: { fontSize: 13, fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: 0.4 },
  reviewName: { fontSize: 22, fontWeight: "800", color: GREEN, marginTop: 2 },
  reviewDescription: { fontSize: 15, lineHeight: 21, color: MUTED, marginTop: 6 },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  reviewRowText: { flex: 1, fontSize: 15, color: GREEN },
  reviewPriceRow: { marginTop: 16 },

  footer: { paddingHorizontal: 24, paddingTop: 8, backgroundColor: CREAM },
  error: { fontSize: 14, lineHeight: 20, color: theme.destructive, marginBottom: 10 },
  pill: { backgroundColor: GREEN, borderRadius: 28, height: 56, alignItems: "center", justifyContent: "center" },
  pillDisabled: { opacity: 0.5 },
  pillText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
