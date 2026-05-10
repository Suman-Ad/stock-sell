// // src/utils/subscription.js

// // ==============================
// // CHECK FEATURE ACCESS
// // ==============================

// export const hasFeature = (
//     user,
//     featureName
// ) => {

//     // No user
//     if (!user) return false;

//     const subscription = user.subscription;

//     // No subscription
//     if (!subscription) return false;

//     // Enterprise all access
//     if (
//         subscription?.features?.mobileScan
//     ) {
//         return true;
//     }

//     return !!subscription?.features?.[featureName];
// };

// // ==============================
// // CHECK PRODUCT LIMIT
// // ==============================

// export const canAddProducts = (
//     user,
//     currentProductCount
// ) => {

//     if (!user) return false;

//     const maxProducts =
//         user?.subscription?.maxProducts;

//     // Unlimited
//     if (maxProducts === -1) {
//         return true;
//     }

//     return currentProductCount < maxProducts;
// };

// // ==============================
// // CHECK USER LIMIT
// // ==============================

// export const canAddUsers = (
//     user,
//     currentUsers
// ) => {

//     if (!user) return false;

//     const maxUsers =
//         user?.subscription?.maxUsers;

//     // Unlimited
//     if (maxUsers === -1) {
//         return true;
//     }

//     return currentUsers < maxUsers;
// };

// // ==============================
// // CHECK SUBSCRIPTION ACTIVE
// // ==============================

// export const isSubscriptionActive = (
//     user
// ) => {

//     if (!user?.subscription) {
//         return false;
//     }

//     const sub = user.subscription;

//     // Must be active
//     if (sub.status !== "active") {
//         return false;
//     }

//     // Expiry check
//     if (sub.endDate) {

//         const endDate =
//             sub.endDate?.toDate
//                 ? sub.endDate.toDate()
//                 : new Date(sub.endDate);

//         if (endDate < new Date()) {
//             return false;
//         }
//     }

//     return true;
// };

// src/utils/subscription.js

// ==============================
// GET SAFE SUBSCRIPTION
// ==============================

export const getSubscription = (user) => {

    const subscription =
        user?.subscription || {};

    return {

        planId:
            subscription.planId || "free",

        planName:
            subscription.planName || "Free",

        price:
            Number(subscription.price) || 0,

        durationDays:
            Number(subscription.durationDays) || 30,

        maxProducts:
            subscription.maxProducts ?? 25,

        maxUsers:
            subscription.maxUsers ?? 1,

        features:
            subscription.features || {},

        status:
            subscription.status || "inactive",

        startDate:
            subscription.startDate || null,

        endDate:
            subscription.endDate || null
    };
};

// ==============================
// CHECK SUBSCRIPTION ACTIVE
// ==============================

export const isSubscriptionActive = (
    user
) => {

    if (!user) {
        return false;
    }

    const sub =
        getSubscription(user);

    // ==========================
    // STATUS CHECK
    // ==========================

    if (sub.status !== "active") {
        return false;
    }

    // ==========================
    // EXPIRY CHECK
    // ==========================

    if (sub.endDate) {

        try {

            const endDate =
                sub.endDate?.toDate
                    ? sub.endDate.toDate()
                    : new Date(sub.endDate);

            // Invalid date
            if (
                isNaN(endDate.getTime())
            ) {

                return false;
            }

            if (
                endDate < new Date()
            ) {

                return false;
            }

        } catch {

            return false;

        }
    }

    return true;
};

// ==============================
// CHECK FEATURE ACCESS
// ==============================

export const hasFeature = (
    user,
    featureName
) => {

    // ==========================
    // USER CHECK
    // ==========================

    if (!user) {
        return false;
    }

    // ==========================
    // ACTIVE SUBSCRIPTION CHECK
    // ==========================

    if (
        !isSubscriptionActive(user)
    ) {

        return false;
    }

    const sub =
        getSubscription(user);

    // ==========================
    // ENTERPRISE ACCESS
    // ==========================

    if (
        sub?.features?.all === true
    ) {

        return true;
    }

    // ==========================
    // FEATURE CHECK
    // ==========================

    return Boolean(
        sub?.features?.[featureName]
    );
};

// ==============================
// CHECK PRODUCT LIMIT
// ==============================

export const canAddProducts = (
    user,
    currentProductCount = 0
) => {

    if (!user) {
        return false;
    }

    if (
        !isSubscriptionActive(user)
    ) {

        return false;
    }

    const sub =
        getSubscription(user);

    const maxProducts =
        Number(sub.maxProducts);

    // Unlimited
    if (maxProducts === -1) {
        return true;
    }

    // Invalid limit
    if (
        isNaN(maxProducts)
    ) {

        return false;
    }

    return (
        currentProductCount <
        maxProducts
    );
};

// ==============================
// CHECK USER LIMIT
// ==============================

export const canAddUsers = (
    user,
    currentUsers = 0
) => {

    if (!user) {
        return false;
    }

    if (
        !isSubscriptionActive(user)
    ) {

        return false;
    }

    const sub =
        getSubscription(user);

    const maxUsers =
        Number(sub.maxUsers);

    // Unlimited
    if (maxUsers === -1) {
        return true;
    }

    // Invalid limit
    if (
        isNaN(maxUsers)
    ) {

        return false;
    }

    return (
        currentUsers <
        maxUsers
    );
};

// ==============================
// GET DAYS LEFT
// ==============================

export const getSubscriptionDaysLeft = (
    user
) => {

    try {

        const sub =
            getSubscription(user);

        if (!sub.endDate) {
            return 0;
        }

        const endDate =
            sub.endDate?.toDate
                ? sub.endDate.toDate()
                : new Date(sub.endDate);

        const now =
            new Date();

        const diff =
            endDate - now;

        return Math.max(
            0,
            Math.ceil(
                diff /
                (1000 * 60 * 60 * 24)
            )
        );

    } catch {

        return 0;

    }
};

// ==============================
// CHECK FREE PLAN
// ==============================

export const isFreePlan = (
    user
) => {

    const sub =
        getSubscription(user);

    return (
        Number(sub.price) <= 0
    );
};