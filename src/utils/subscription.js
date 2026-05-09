// src/utils/subscription.js

// ==============================
// CHECK FEATURE ACCESS
// ==============================

export const hasFeature = (
    user,
    featureName
) => {

    // No user
    if (!user) return false;

    const subscription = user.subscription;

    // No subscription
    if (!subscription) return false;

    // Enterprise all access
    if (
        subscription?.features?.all
    ) {
        return true;
    }

    return !!subscription?.features?.[featureName];
};

// ==============================
// CHECK PRODUCT LIMIT
// ==============================

export const canAddProducts = (
    user,
    currentProductCount
) => {

    if (!user) return false;

    const maxProducts =
        user?.subscription?.maxProducts;

    // Unlimited
    if (maxProducts === -1) {
        return true;
    }

    return currentProductCount < maxProducts;
};

// ==============================
// CHECK USER LIMIT
// ==============================

export const canAddUsers = (
    user,
    currentUsers
) => {

    if (!user) return false;

    const maxUsers =
        user?.subscription?.maxUsers;

    // Unlimited
    if (maxUsers === -1) {
        return true;
    }

    return currentUsers < maxUsers;
};

// ==============================
// CHECK SUBSCRIPTION ACTIVE
// ==============================

export const isSubscriptionActive = (
    user
) => {

    if (!user?.subscription) {
        return false;
    }

    const sub = user.subscription;

    // Must be active
    if (sub.status !== "active") {
        return false;
    }

    // Expiry check
    if (sub.endDate) {

        const endDate =
            sub.endDate?.toDate
                ? sub.endDate.toDate()
                : new Date(sub.endDate);

        if (endDate < new Date()) {
            return false;
        }
    }

    return true;
};