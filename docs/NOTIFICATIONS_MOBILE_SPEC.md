# Mobile App Notification System Specification

## Document Overview

This specification covers the implementation of a notification system for the COPA mobile app (Comprehensive Outdoor Playspace Audit Tool, Expo + React Native). It is designed to work with the backend notification API and follows platform best practices from mobile-design, react-native-architecture, and ui-ux-pro-max skills.

**Prerequisites Met:**

- Platform: iOS + Android (Cross-platform)
- Framework: React Native + Expo
- Files Referenced: touch-psychology.md, mobile-performance.md, react-native-architecture skill
- Stack: React Native with Zustand state management, Tamagui UI

---

## 1. Mobile Notification Architecture

### 1.1 System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Assignment Service → Notification Service → Database    │   │
│  │  /me/notifications  │  /me/notifications/unread-count    │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS JSON API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Mobile App (Expo + RN)                         │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────┐ │
│  │ Auth Store    │  │ Notifications │  │ Places Store         │ │
│  │ (Zustand)     │  │ Store         │  │ (Zustand)            │ │
│  └───────────────┘  └───────────────┘  └──────────────────────┘ │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────────┐ │
│  │ API Client    │  │ Polling       │  │ UI Components        │ │
│  │               │  │ (30s interval)│  │ (Tamagui)            │ │
│  └───────────────┘  └───────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Notification Types

| Type                 | Title                | Message                                                   | Action            |
| -------------------- | -------------------- | --------------------------------------------------------- | ----------------- |
| `assignment_created` | "New Assignment"     | "You have been assigned to [Place] in project [Project]." | Navigate to place |
| `assignment_updated` | "Assignment Updated" | "Your assignment at [Place] has been updated."            | Navigate to place |
| `assignment_deleted` | "Assignment Removed" | "Your assignment at [Place] has been removed."            | Show in list      |

---

## 2. API Client Specification

### 2.1 Endpoints

Based on backend spec (NOTIFICATIONS_BACKEND_SPEC.md):

| Endpoint                                    | Method | Purpose                        |
| ------------------------------------------- | ------ | ------------------------------ |
| `/playspace/me/notifications`               | GET    | List notifications (paginated) |
| `/playspace/me/notifications/unread-count`  | GET    | Get unread count (lightweight) |
| `/playspace/me/notifications/{id}/read`     | PATCH  | Mark single as read            |
| `/playspace/me/notifications/mark-all-read` | POST   | Mark all as read               |

### 2.2 Implementation (lib/notifications/api.ts)

```typescript
import { getApiBaseUrl } from "lib/api-base-url";
import { useAuthStore } from "stores/auth-store";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const notificationSchema = z.object({
    id: z.string().uuid(),
    notification_type: z.enum(["assignment_created", "assignment_updated", "assignment_deleted"]),
    title: z.string(),
    message: z.string(),
    project_id: z.string().uuid(),
    place_id: z.string().uuid(),
    project_name: z.string(),
    place_name: z.string(),
    assignment_id: z.string().uuid().nullable(),
    is_read: z.boolean(),
    read_at: z.string().nullable(),
    created_at: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationType = Notification["notification_type"];

const notificationListSchema = z.object({
    notifications: z.array(notificationSchema),
    total: z.number(),
    unread_count: z.number(),
});

const unreadCountSchema = z.object({
    unread_count: z.number(),
});

const markReadResponseSchema = z.object({
    status: z.string(),
    message: z.string().optional(),
});

const markAllReadResponseSchema = z.object({
    marked_read: z.number(),
});

// ============================================================================
// API CLIENT
// ============================================================================

/**
 * Fetch notifications for the authenticated auditor.
 *
 * @param options - Query options
 * @returns Notifications list with pagination metadata
 *
 * UI/UX Considerations:
 * - Shows up to 50 notifications per page
 * - Sorted newest-first (created_at DESC)
 * - Unread shown first when unread_only=true
 */
export async function fetchNotifications(options: { unreadOnly?: boolean; limit?: number; offset?: number }): Promise<{
    notifications: Notification[];
    total: number;
    unread_count: number;
}> {
    const session = useAuthStore.getState().session;
    if (!session) {
        throw new Error("Not authenticated");
    }

    const params = new URLSearchParams();
    if (options.unreadOnly) params.set("unread_only", "true");
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/playspace/me/notifications?${params.toString()}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
    }

    const data = await response.json();
    return notificationListSchema.parse(data);
}

/**
 * Fetch unread notification count (lightweight endpoint).
 *
 * Performance Considerations:
 * - Returns minimal payload (~20 bytes JSON)
 * - Optimized for frequent polling
 * - Uses database index for fast count query
 */
export async function fetchUnreadCount(): Promise<number> {
    const session = useAuthStore.getState().session;
    if (!session) {
        throw new Error("Not authenticated");
    }

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/playspace/me/notifications/unread-count`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch unread count: ${response.status}`);
    }

    const data = await response.json();
    return unreadCountSchema.parse(data).unread_count;
}

/**
 * Mark a single notification as read.
 *
 * @param notificationId - ID of notification to mark as read
 * @returns Success status
 */
export async function markAsRead(notificationId: string): Promise<void> {
    const session = useAuthStore.getState().session;
    if (!session) {
        throw new Error("Not authenticated");
    }

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/playspace/me/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.status}`);
    }
}

/**
 * Mark all unread notifications as read.
 *
 * @returns Number of notifications marked as read
 */
export async function markAllAsRead(): Promise<number> {
    const session = useAuthStore.getState().session;
    if (!session) {
        throw new Error("Not authenticated");
    }

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/playspace/me/notifications/mark-all-read`, {
        method: "POST",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${session.accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to mark all as read: ${response.status}`);
    }

    const data = await response.json();
    return markAllReadResponseSchema.parse(data).marked_read;
}
```

---

## 3. State Management (Zustand)

### 3.1 Notification Store Specification

```typescript
// stores/notifications-store.ts

import { create } from "zustand";
import * as api from "lib/notifications/api";
import type { Notification } from "lib/notifications/api";

/**
 * Notification store state interface.
 *
 * Design Principles:
 * - Zustand for simple, lightweight state management
 * - Follows existing store patterns in the codebase
 * - Handles loading/error states for UI feedback
 */
interface NotificationsState {
    // State
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    isLoadingCount: boolean;
    error: string | null;

    // Actions
    loadNotifications: (options?: { unreadOnly?: boolean; limit?: number; offset?: number }) => Promise<void>;
    loadUnreadCount: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearError: () => void;
}

/**
 * Global notification state store.
 *
 * Performance Considerations:
 * - loadUnreadCount is lightweight (small payload, optimized query)
 * - Uses optimistic updates for instant UI feedback
 * - Error handling with clearError for recovery
 *
 * Mobile Considerations:
 * - Works offline with cached data
 * - Polling continues when app is in foreground
 * - Background polling reduced to save battery
 */
export const useNotificationsStore = create<NotificationsState>((set, get) => ({
    // Initial state
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isLoadingCount: false,
    error: null,

    /**
     * Load notifications with optional filtering and pagination.
     *
     * @param options - Query options
     */
    loadNotifications: async (options = {}) => {
        set({ isLoading: true, error: null });
        try {
            const result = await api.fetchNotifications(options);
            set({
                notifications: result.notifications,
                unreadCount: result.unread_count,
                isLoading: false,
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to load notifications",
                isLoading: false,
            });
        }
    },

    /**
     * Load only unread count (lightweight operation).
     *
     * Performance: Uses dedicated lightweight endpoint
     * Polling: Called every 30 seconds when app is active
     */
    loadUnreadCount: async () => {
        set({ isLoadingCount: true });
        try {
            const count = await api.fetchUnreadCount();
            set({ unreadCount: count, isLoadingCount: false });
        } catch {
            // Silently fail for background polling - don't disrupt user
            set({ isLoadingCount: false });
        }
    },

    /**
     * Mark a single notification as read.
     *
     * UX: Optimistic update for instant feedback
     * @param notificationId - ID of notification to mark as read
     */
    markAsRead: async (notificationId: string) => {
        const previousNotifications = get().notifications;
        const previousCount = get().unreadCount;

        // Optimistic update - instant UI feedback
        set({
            notifications: get().notifications.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
            unreadCount: Math.max(0, previousCount - 1),
        });

        try {
            await api.markAsRead(notificationId);
        } catch (error) {
            // Rollback on failure
            set({
                notifications: previousNotifications,
                unreadCount: previousCount,
                error: error instanceof Error ? error.message : "Failed to mark as read",
            });
        }
    },

    /**
     * Mark all notifications as read.
     *
     * UX: Optimistic update for instant feedback
     */
    markAllAsRead: async () => {
        const previousNotifications = get().notifications;
        const previousCount = get().unreadCount;

        // Optimistic update
        set({
            notifications: get().notifications.map((n) => ({ ...n, is_read: true })),
            unreadCount: 0,
        });

        try {
            await api.markAllAsRead();
        } catch (error) {
            // Rollback on failure
            set({
                notifications: previousNotifications,
                unreadCount: previousCount,
                error: error instanceof Error ? error.message : "Failed to mark all as read",
            });
        }
    },

    /**
     * Clear error state for recovery.
     */
    clearError: () => set({ error: null }),
}));
```

---

## 4. UI/UX Specification

### 4.1 Notification Badge (Bell Icon)

Location: Dashboard header, top-right corner (existing Bell icon position)

```tsx
// In DashboardScreen - Bell icon area
import { useNotificationsStore } from "stores/notifications-store";

const unreadCount = useNotificationsStore((state) => state.unreadCount);

/**
 * Bell Icon with Badge
 *
 * Mobile Design Principles:
 * - Touch target: 46x46 (exceeds 44pt minimum)
 * - Badge positioned top-right for visibility
 * - Shows "9+" for counts > 9
 * - Haptic feedback on tap (platform-specific)
 *
 * Accessibility:
 * - accessibilityLabel for screen readers
 * - Minimum contrast 4.5:1
 */
<YStack position="relative">
    <YStack
        width={46}
        height={46}
        items="center"
        justify="center"
        rounded={ds.radii.full}
        borderWidth={1}
        borderColor={ds.colors.border}
        bg={ds.colors.surfaceMuted}
        onPress={() => setShowNotificationsPanel(true)}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
    >
        <Bell size={20} color={ds.colors.foreground} />
    </YStack>

    {/* Unread Badge - positioned top-right of bell */}
    {unreadCount > 0 && (
        <YStack
            position="absolute"
            top={-4}
            right={-4}
            minWidth={20}
            height={20}
            items="center"
            justify="center"
            rounded={ds.radii.full}
            bg={ds.colors.danger}
            px={1}
            accessibilityLabel={`${unreadCount} unread notifications`}
        >
            <Text color={ds.colors.primaryForeground} fontSize={11} fontFamily={ds.fonts.monoBold}>
                {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
        </YStack>
    )}
</YStack>;
```

### 4.2 Notifications Panel (Modal/Drawer)

The notifications panel slides up from the bottom (iOS sheet pattern) or appears as a modal.

```tsx
// components/notifications/notifications-panel.tsx

import { useCallback, useMemo } from "react";
import { ScrollView, YStack, Text, XStack, Button } from "tamagui";
import { formatRelativeTimeLabel } from "lib/i18n/format";
import { useNotificationsStore } from "stores/notifications-store";
import { useDesignSystem } from "lib/design-system";
import { useRouter } from "expo-router";

/**
 * Notifications Panel Component
 *
 * UX Principles (from ui-ux-pro-max):
 * - Bottom sheet pattern for iOS
 * - Clear close affordance
 * - Each notification tappable for action
 * - "Mark all as read" button for bulk action
 * - Empty state when no notifications
 *
 * Accessibility:
 * - accessibilityLabel on each notification
 * - Semantic structure for screen readers
 * - Focus management on open/close
 */
export function NotificationsPanel() {
    const ds = useDesignSystem();
    const router = useRouter();
    const { t, i18n } = useTranslation(["notifications", "common"]);

    const notifications = useNotificationsStore((state) => state.notifications);
    const unreadCount = useNotificationsStore((state) => state.unreadCount);
    const markAsRead = useNotificationsStore((state) => state.markAsRead);
    const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);
    const isLoading = useNotificationsStore((state) => state.isLoading);

    const handleNotificationPress = useCallback(
        (notification: Notification) => {
            // Mark as read if unread
            if (!notification.is_read) {
                markAsRead(notification.id);
            }

            // Navigate to the place
            router.push(`/execute/${notification.place_id}?projectId=${encodeURIComponent(notification.project_id)}`);
        },
        [markAsRead, router],
    );

    const handleMarkAllAsRead = useCallback(() => {
        markAllAsRead();
    }, [markAllAsRead]);

    const renderNotification = useCallback(
        (notification: Notification) => {
            const timeLabel = formatRelativeTimeLabel(
                notification.created_at,
                null, // started_at
                i18n.language,
                t,
            );

            return (
                <YStack
                    key={notification.id}
                    padding="$3"
                    borderBottomWidth={1}
                    borderBottomColor={ds.colors.border}
                    bg={notification.is_read ? ds.colors.surface : ds.colors.surfaceMuted}
                    opacity={notification.is_read ? 0.7 : 1}
                    onPress={() => handleNotificationPress(notification)}
                    accessibilityLabel={`${notification.title}: ${notification.message}`}
                    accessibilityRole="button"
                >
                    {/* Notification Type Badge */}
                    <XStack gap="$2" mb="$1">
                        <Badge variant={notification.is_read ? "secondary" : "primary"}>
                            {notification.notification_type === "assignment_created"
                                ? "New"
                                : notification.notification_type === "assignment_updated"
                                  ? "Updated"
                                  : "Removed"}
                        </Badge>
                        <Text color={ds.colors.mutedForeground} fontSize={ds.typography.labelXs.fontSize}>
                            {timeLabel}
                        </Text>
                    </XStack>

                    {/* Title */}
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyMd.fontSize}
                        mb="$1"
                    >
                        {notification.title}
                    </Text>

                    {/* Message */}
                    <Text color={ds.colors.mutedForeground} fontSize={ds.typography.bodySm.fontSize} numberOfLines={2}>
                        {notification.message}
                    </Text>

                    {/* Project/Place info */}
                    <XStack gap="$1" mt="$2">
                        <Text
                            color={ds.colors.primary}
                            fontSize={ds.typography.labelSm.fontSize}
                            fontFamily={ds.fonts.monoMedium}
                        >
                            {notification.project_name}
                        </Text>
                        <Text color={ds.colors.mutedForeground} fontSize={ds.typography.labelSm.fontSize}>
                            {" • "}
                        </Text>
                        <Text color={ds.colors.foreground} fontSize={ds.typography.labelSm.fontSize}>
                            {notification.place_name}
                        </Text>
                    </XStack>
                </YStack>
            );
        },
        [ds, handleNotificationPress, i18n.language, t],
    );

    return (
        <YStack flex={1} bg={ds.colors.background}>
            {/* Header */}
            <XStack
                padding="$4"
                justify="space-between"
                items="center"
                borderBottomWidth={1}
                borderBottomColor={ds.colors.border}
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={ds.typography.titleLg.fontSize}
                >
                    {t("notifications.title", { ns: "dashboard" })}
                </Text>

                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onPress={handleMarkAllAsRead}
                        accessibilityLabel={t("notifications.markAllRead", { ns: "dashboard" })}
                    >
                        <Text
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.labelSm.fontSize}
                        >
                            {t("actions.markAllRead", { ns: "common" })}
                        </Text>
                    </Button>
                )}
            </XStack>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <YStack flex={1} items="center" justify="center" padding="$6">
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                    >
                        {t("notifications.empty", { ns: "dashboard" })}
                    </Text>
                </YStack>
            ) : (
                <ScrollView
                    flex={1}
                    contentContainerStyle={{ paddingBottom: ds.spacing[6] }}
                    showsVerticalScrollIndicator={false}
                >
                    {notifications.map(renderNotification)}
                </ScrollView>
            )}
        </YStack>
    );
}
```

### 4.3 Touch Target & Spacing Requirements

| Element               | Specification               | Rationale                              |
| --------------------- | --------------------------- | -------------------------------------- |
| Bell Icon             | 46x46pt minimum             | Exceeds 44pt iOS minimum               |
| Notification Card     | Full-width, min 72pt height | Easy tap target, visible content       |
| Spacing between cards | 0 (border separated)        | Consistent with app style              |
| Badge                 | 20x20pt, top-right of bell  | Clear visibility, doesn't obscure icon |
| Panel close button    | 44x44pt minimum             | Accessibility compliant                |

---

## 5. Polling Integration

### 5.1 App Layout Integration

In `app/_layout.tsx`, add polling after authentication is confirmed:

```typescript
// In RootLayoutNav() or after auth status check
useEffect(() => {
    if (authStatus !== "authenticated" || authSession === null) {
        return;
    }

    // Initial load of unread count
    useNotificationsStore.getState().loadUnreadCount();

    // Poll every 30 seconds when app is active
    // Note: This runs in JS thread, battery conscious
    const POLLING_INTERVAL = 30000; // 30 seconds
    const interval = setInterval(() => {
        useNotificationsStore.getState().loadUnreadCount();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
}, [authStatus, authSession]);
```

### 5.2 Background Polling (Future Enhancement)

The mobile app has existing background sync (`expo-background-task`). For MVP, we use foreground polling. Future enhancement could include:

- Reduce polling to 5 minutes when app is backgrounded
- Use background sync task for notification delivery
- Combine with Expo Push Notifications for instant delivery

---

## 6. Deep Linking

### 6.1 Navigation from Notification

When user taps a notification, they navigate to the assigned place:

```typescript
// In notification press handler
router.push(`/execute/${notification.place_id}?projectId=${encodeURIComponent(notification.project_id)}`);
```

This follows the existing navigation pattern in the app.

---

## 7. Error Handling & Edge Cases

### 7.1 Network Errors

| Scenario      | Handling                                                 |
| ------------- | -------------------------------------------------------- |
| No network    | Show cached notifications; polling continues when online |
| Polling fails | Silently retry on next interval; show last known count   |
| API error     | Show toast with retry option; keep cached data           |

### 7.2 UI States

| State   | UI                                               |
| ------- | ------------------------------------------------ |
| Loading | Skeleton/shimmer in notification panel           |
| Empty   | "No notifications yet" message with helpful text |
| Error   | Error message with "Try Again" button            |
| Offline | Cached data shown; badge may show stale count    |

### 7.3 Performance

| Consideration  | Implementation                   |
| -------------- | -------------------------------- |
| List rendering | FlatList/FlashList for 50+ items |
| Memoization    | React.memo on notification cards |
| Image loading  | N/A (text-only notifications)    |
| Bundle size    | Minimal - no new dependencies    |

---

## 8. Accessibility (WCAG 2.1 AA Compliance)

### 8.1 Requirements

| Requirement    | Implementation                                 |
| -------------- | ---------------------------------------------- |
| Touch targets  | ≥44pt (iOS) / ≥48dp (Android)                  |
| Color contrast | ≥4.5:1 for text                                |
| Screen reader  | accessibilityLabel on all interactive elements |
| Focus order    | Logical order in notification list             |
| Reduced motion | Respects system preference                     |

### 8.2 Implementation

```tsx
// Notification card accessibility
<YStack
  onPress={handlePress}
  accessibilityLabel={`${notification.title}: ${notification.message}`}
  accessibilityHint={`Tap to view ${notification.place_name} in ${notification.project_name}`}
  accessibilityRole="button"
>
  {/* Content */}
</YStack>

// Badge accessibility
<YStack
  accessibilityLabel={`${unreadCount} unread notifications`}
  accessibilityRole="statistic"
>
  {/* Badge content */}
</YStack>
```

---

## 9. File Changes Summary

| File                                               | Action | Description                                   |
| -------------------------------------------------- | ------ | --------------------------------------------- |
| `lib/notifications/api.ts`                         | CREATE | API client with Zod schemas                   |
| `lib/notifications/types.ts`                       | CREATE | TypeScript types (can be in api.ts)           |
| `stores/notifications-store.ts`                    | CREATE | Zustand store                                 |
| `app/(tabs)/index.tsx`                             | MODIFY | Add bell icon with badge, notifications panel |
| `app/(tabs)/_layout.tsx`                           | MODIFY | Add polling on auth                           |
| `components/notifications/notifications-panel.tsx` | CREATE | Notifications panel component                 |
| `components/notifications/notification-card.tsx`   | CREATE | Individual notification card                  |

---

## 10. Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Create `lib/notifications/api.ts`
- [ ] Create `stores/notifications-store.ts`
- [ ] Test API client with mock data

### Phase 2: UI Components

- [ ] Update bell icon with badge in dashboard
- [ ] Create `notifications-panel.tsx`
- [ ] Create `notification-card.tsx`
- [ ] Add notifications panel modal

### Phase 3: Integration

- [ ] Add polling to app layout
- [ ] Wire up notifications store to UI
- [ ] Test deep linking from notification tap

### Phase 4: Polish

- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error handling
- [ ] Accessibility testing
- [ ] Test on iOS and Android

---

## 11. Cross-Reference: Skill Compliance

### mobile-design Skill

| Rule                 | Compliance                                      |
| -------------------- | ----------------------------------------------- |
| Touch target ≥44pt   | ✅ Bell icon: 46pt, cards: full-width           |
| Thumb zone           | ✅ Bell icon in top-right (easily reachable)    |
| Platform conventions | ✅ iOS sheet pattern, Material where applicable |
| Offline support      | ✅ Cached data, graceful degradation            |

### react-native-architecture Skill

| Pattern       | Compliance                        |
| ------------- | --------------------------------- |
| Zustand state | ✅ Follows existing store pattern |
| Service layer | ✅ API client separated from UI   |
| Offline-first | ✅ Cached data, polling           |
| Expo Router   | ✅ Uses existing navigation       |

### ui-ux-pro-max Skill

| Category            | Compliance                       |
| ------------------- | -------------------------------- |
| Touch & Interaction | ✅ 44pt+ targets, press feedback |
| Accessibility       | ✅ accessibilityLabel, contrast  |
| Navigation          | ✅ Bottom sheet, deep linking    |
| Performance         | ✅ Optimized list, memoization   |

---

## 12. Future Enhancements

### Short Term

- [ ] Push notifications via Expo Push service
- [ ] Background sync integration
- [ ] Notification preferences/settings

### Long Term

- [ ] WebSocket for real-time delivery
- [ ] Notification categories
- [ ] Read receipt tracking

---

**End of Mobile Notification Specification**
