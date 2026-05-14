import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "../firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    writeBatch,
    getDocs
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import StockSummary from "./StockSummary";
import { QRCodeCanvas } from "qrcode.react";
import useUserRole from "../hooks/useUserRole";
import StockInventory from "./StockInventory";
import "../assets/StockList.css";
import FeatureGate from "../components/FeatureGate";

const createQRCodes = async (item, sizeKey, quantity, options = {}) => {
    const batch = writeBatch(db);
    const sizeData = item.sizes[sizeKey];
    const start = sizeData.initialQty || 0;

    for (let i = 1; i <= quantity; i++) {
        const unitNo = start + i;

        const ref = doc(collection(db, "qrcodes"));

        batch.set(ref, {
            stockId: item.id,
            productName: item.productName,
            productId: item.productId,
            catalogId: item.catalogId,
            category: item.category || "",
            subCategory: item.subCategory || "",
            productType: item.productType || "",
            size: sizeKey,
            color: item.color || "",
            unitNo,
            uniqueId: `${item.productId}-${sizeKey}-${item.id}-${unitNo}`,
            sellingPrice: sizeData.sellingPrice || 0,
            status: "available",
            printed: false,
            isOnlineItem:
                options.isOnlineItem || false,

            inventorySource:
                options.inventorySource || "core",

            platform:
                options.platform || "",

            isMarketplaceQR:
                options.isMarketplaceQR || false,

            createdAt: serverTimestamp()
        });
    }

    await batch.commit();
};


const defaultStoreLinks = {
    meesho: "",
    flipkart: "",
    amazon: "",
    myntra: "",
    ajio: "",
    glowroad: "",
    custom: ""
};

const ensureStoreLinks = (sizes = {}) => {

    const updated = {};

    Object.entries(sizes).forEach(([sizeKey, sizeData]) => {

        updated[sizeKey] = {
            ...sizeData,

            storeLinks: {
                ...defaultStoreLinks,
                ...(sizeData.storeLinks || {})
            }
        };
    });

    return updated;
};


const storePlatforms = [
    {
        key: "meesho",
        label: "Meesho",
        icon: "🛍"
    },
    {
        key: "flipkart",
        label: "Flipkart",
        icon: "🛒"
    },
    {
        key: "amazon",
        label: "Amazon",
        icon: "📦"
    },
    {
        key: "myntra",
        label: "Myntra",
        icon: "👕"
    },
    {
        key: "ajio",
        label: "Ajio",
        icon: "✨"
    },
    {
        key: "glowroad",
        label: "GlowRoad",
        icon: "🚚"
    },
    {
        key: "custom",
        label: "Custom",
        icon: "🔗"
    }
];

const isValidUrl = (url) => {

    if (!url) return false;

    try {

        new URL(
            url.startsWith("http")
                ? url
                : `https://${url}`
        );

        return true;

    } catch {

        return false;

    }
};

const normalizeUrl = (url) => {

    if (!url) return "";

    return url.startsWith("http")
        ? url
        : `https://${url}`;
};

const copyToClipboard = async (text) => {

    try {

        await navigator.clipboard.writeText(text);

        alert("Link copied");

    } catch {

        alert("Copy failed");

    }
};

const MASTER_SIZE_ORDER = [
    "FREE SIZE",
    "XXXS",
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "XXXL",
    "4XL",
    "5XL",
    "6XL",
    "7XL",
    "8XL",
    "0-3M",
    "3-6M",
    "6-9M",
    "9-12M",
    "12-18M",
    "18-24M",
    "2Y",
    "3Y",
    "4Y",
    "5Y",
    "6Y",
    "7Y",
    "8Y",
    "9Y",
    "10Y",
    "11Y",
    "12Y",
    "13Y",
    "14Y",
    "15Y"
];

const StockList = ({ user }) => {

    const [showInventory, setShowInventory] = useState(false);
    // Print 
    const [printItem, setPrintItem] = useState(null);
    const [selectedSize, setSelectedSize] = useState("ALL");
    const [printedIds, setPrintedIds] = useState(new Set());
    const [forceQRPrint, setForceQRPrint] = useState({});
    const navigate = useNavigate();

    const [deleteProgress, setDeleteProgress] = useState({
        active: false,
        total: 0,
        completed: 0,
        current: ""
    });

    const [qrData, setQrData] = useState({});

    const qrDataFlat = useMemo(() => {
        return Object.values(qrData).flat();
    }, [qrData]);

    const loadItemQR = async (stockId) => {

        const q = query(
            collection(db, "qrcodes"),
            where("stockId", "==", stockId),
            where("status", "in", ["available", "sold", "removed"])
        );

        const snap = await getDocs(q);

        const data = snap.docs.map(doc => ({

            id: doc.id,
            ...doc.data()
        }));

        setQrData(prev => ({
            ...prev,
            [stockId]: data
        }));
    };


    const canEditStock = (item) => {
        if (!user) return false;

        return (
            user.uid === item.userId ||
            // role === "admin" ||
            role === "superadmin"
        );
    };


    // useEffect(() => {
    //     const q = query(collection(db, "qrcodes"));

    //     const unsub = onSnapshot(q, (snap) => {
    //         const data = snap.docs.map(doc => ({
    //             id: doc.id,
    //             ...doc.data()
    //         }));
    //         setQrData(data);
    //     });

    //     return () => unsub();
    // }, []);

    const [stockLoading, setStockLoading] = useState(true);
    const [qrLoading, setQrLoading] = useState({});
    const [printProgress, setPrintProgress] = useState({
        total: 0,
        completed: 0,
        active: false
    });

    const role = useUserRole();

    const isAdmin =
        role === "superadmin" ||
        role === "admin";

    const [stocks, setStocks] = useState([]);
    const [searchId, setSearchId] = useState("");
    const [selectedUser, setSelectedUser] = useState("all");
    const [popularityFilter, setPopularityFilter] = useState("");

    useEffect(() => {

        if (
            (role === "admin" || role === "superadmin") &&
            user?.uid
        ) {
            setSelectedUser(user.uid);
        }

    }, [role, user]);

    const [showQR, setShowQR] = useState({});
    const [sizeQrPopup, setSizeQrPopup] = useState({
        open: false,
        item: null,
        size: ""
    });
    const toggleQR = async (item) => {

        const id = item.catalogId;

        setQrLoading(prev => ({
            ...prev,
            [id]: true
        }));

        try {

            if (!showQR[id] && !qrData[item.id]) {
                await loadItemQR(item.id);
            }

            setShowQR(prev => ({
                ...prev,
                [id]: !prev[id]
            }));

        } catch (err) {

            console.error(err);

        } finally {

            setQrLoading(prev => ({
                ...prev,
                [id]: false
            }));
        }
    };

    const [qrPopup, setQrPopup] = useState({
        open: false,
        value: ""
    });

    const [soldIds, setSoldIds] = useState(new Set());
    const [salesMap, setSalesMap] = useState({});

    // useEffect(() => {
    //     const unsubscribe = onSnapshot(collection(db, "sales"), (snapshot) => {
    //         const ids = new Set(snapshot.docs.map(doc => doc.data().uniqueId));
    //         setSoldIds(ids);
    //     });

    //     return () => unsubscribe();
    // }, []);

    // useEffect(() => {

    //     const unsubscribe = onSnapshot(
    //         collection(db, "sales"),
    //         async (snapshot) => {

    //             const ids = new Set(
    //                 snapshot.docs.map(doc => doc.data().uniqueId)
    //             );

    //             setSoldIds(ids);

    //             // 🔥 refresh opened QR items
    //             const openedIds = Object.keys(showQR);

    //             await Promise.all(
    //                 openedIds.map(async (catalogId) => {

    //                     const stock = stocks.find(
    //                         s => s.catalogId === catalogId
    //                     );

    //                     if (stock) {
    //                         await loadItemQR(stock.id);
    //                     }
    //                 })
    //             );
    //         }
    //     );

    //     return () => unsubscribe();

    // }, [showQR, stocks]);

    useEffect(() => {

        const unsubscribe = onSnapshot(
            collection(db, "sales"),
            (snapshot) => {

                const ids = new Set();
                const map = {};

                snapshot.docs.forEach(doc => {

                    const data = doc.data();

                    if (data.uniqueId) {
                        ids.add(data.uniqueId);
                    }

                    if (data.catalogId) {
                        map[data.catalogId] =
                            (map[data.catalogId] || 0) + 1;
                    }
                });

                setSoldIds(ids);
                setSalesMap(map);
            }
        );

        return () => unsubscribe();

    }, []);

    useEffect(() => {

        if (!auth.currentUser || !role) return;

        setStockLoading(true);

        let q;

        if (role === "superadmin" || role === "admin") {

            // 🔥 Admin can filter later using selectedUser
            q = query(collection(db, "stocks"));

        } else {

            q = query(
                collection(db, "stocks"),
                where("userId", "==", auth.currentUser.uid)
            );

        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {

                const data = snapshot.docs.map(doc => {
                    const stock = {
                        id: doc.id,
                        ...doc.data()
                    };

                    const sizes = ensureStoreLinks(stock.sizes);

                    const totalQty = getTotalQty(sizes);
                    const totalInvestment = getTotalInvestment(sizes);
                    const totalExtraCost = getTotalExtraCost(sizes);
                    const totalSelling = getTotalSellingValue(sizes);
                    const profit = getTotalProfit(sizes);
                    const avgSelling = getAvgSellingPrice(sizes);
                    const popularity = getCatalogPopularity(stock.catalogId);

                    return {
                        ...stock,
                        sizes,
                        catalogPopularity: popularity,
                        totalQty,
                        totalInvestment,
                        totalExtraCost,
                        totalSelling,
                        profit,
                        avgSelling
                    };
                });

                setStocks(data);

                // ✅ stop loading
                setStockLoading(false);
            },
            (error) => {

                console.error(error);

                setStockLoading(false);
            }
        );

        return () => unsubscribe();

    }, [role]);


    // Delete stock
    const handleDelete = async (item) => {

        if (!window.confirm(`Delete ${item.productName} ?`)) return;

        if (
            user.uid !== item.userId &&
            role !== "superadmin"
        ) {
            alert("You are not authorized");
            return;
        }

        try {

            setDeleteProgress({
                active: true,
                total: 1,
                completed: 0,
                current: item.catalogId
            });

            // 🔥 Find all QR linked to this stock
            const q = query(
                collection(db, "qrcodes"),
                where("stockId", "==", item.id)
            );

            const snapshot = await getDocs(q);

            // 🔥 Batch delete
            const batch = writeBatch(db);

            snapshot.forEach((docSnap) => {
                batch.delete(docSnap.ref);
            });

            batch.delete(doc(db, "stocks", item.id));

            await batch.commit();

            setDeleteProgress({
                active: true,
                total: 1,
                completed: 1,
                current: item.catalogId
            });

            setTimeout(() => {
                setDeleteProgress({
                    active: false,
                    total: 0,
                    completed: 0,
                    current: ""
                });
            }, 800);

            alert("Stock + QR deleted successfully");

        } catch (err) {

            console.error(err);

            setDeleteProgress({
                active: false,
                total: 0,
                completed: 0,
                current: ""
            });

            alert("Delete failed");
        }
    };

    // ========================================
    // DELETE FILTERED STOCKS
    // ========================================

    const handleDeleteFilteredStocks = async () => {

        if (!filteredStocks.length) {
            alert("No filtered stocks found");
            return;
        }

        const confirmDelete = window.confirm(
            `Delete ${filteredStocks.length} filtered stock item(s)?`
        );

        if (!confirmDelete) return;

        try {

            setDeleteProgress({
                active: true,
                total: filteredStocks.length,
                completed: 0,
                current: ""
            });

            for (let i = 0; i < filteredStocks.length; i++) {

                const item = filteredStocks[i];

                setDeleteProgress({
                    active: true,
                    total: filteredStocks.length,
                    completed: i,
                    current: item.catalogId
                });

                // 🔥 Find all QR linked to this stock
                const q = query(
                    collection(db, "qrcodes"),
                    where("stockId", "==", item.id)
                );

                const snapshot = await getDocs(q);

                const batch = writeBatch(db);

                snapshot.forEach((docSnap) => {
                    batch.delete(docSnap.ref);
                });

                batch.delete(doc(db, "stocks", item.id));

                await batch.commit();

                setDeleteProgress({
                    active: true,
                    total: filteredStocks.length,
                    completed: i + 1,
                    current: item.catalogId
                });
            }

            setTimeout(() => {

                setDeleteProgress({
                    active: false,
                    total: 0,
                    completed: 0,
                    current: ""
                });

            }, 1000);

            alert("Filtered stocks deleted successfully");

        } catch (err) {

            console.error(err);

            setDeleteProgress({
                active: false,
                total: 0,
                completed: 0,
                current: ""
            });

            alert("Bulk delete failed");
        }
    };

    const getTotalQty = (sizes) => {
        return Number(Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty || 0),
            0
        ).toFixed(0));
    };

    const getTotalInvestment = (sizes) => {
        return Number(Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty * (s.buyingPrice || 0)),
            0
        ).toFixed(0));
    };

    const getTotalSellingValue = (sizes) => {
        return Number(Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty * (s.sellingPrice || 0)),
            0
        ).toFixed(0));
    };

    const getTotalExtraCost = (sizes) => {
        return Object.values(sizes || {}).reduce((sum, s) => {
            const extraCosts = s.extraCosts || {};
            const qty = Number(s.qty || 0);

            const breake =
                Number(extraCosts.packaging || 0) +
                Number(extraCosts.labeling || 0) +
                Number(extraCosts.rto || 0) +
                Number(extraCosts.returnCost || 0) +
                Number(extraCosts.advertisementCost || 0) +
                Number(extraCosts.delivery || 0) +
                Number(extraCosts.others || 0);

            return sum + (breake * qty);
        }, 0);
    };

    // const getTotalProfit 
    const getTotalProfit = (sizes) => {
        return Number(Object.values(sizes || {}).reduce((sum, s) => {

            const buying = Number(s.buyingPrice || 0);
            const margin = Number(s.qty) * (buying * Number(s.margin || 0)) / 100;

            return sum + margin;

        }, 0).toFixed(0));
    };

    const getAvgSellingPrice = (sizes) => {
        const totalQty = getTotalQty(sizes);
        if (!totalQty) return 0;
        return Number((getTotalSellingValue(sizes) / totalQty).toFixed(0));
    };

    const getSellingPrice = (buying, margin, extraCosts = {}) => {
        const {
            packaging = 0,
            labeling = 0,
            rto = 0,
            returnCost = 0,
            advertisementCost = 0,
            delivery = 0,
            others = 0,
            gst = 0
        } = extraCosts;

        const breakEven =
            Number(buying) * (1 + Number(margin || 0) / 100) +
            Number(packaging) +
            Number(labeling) +
            Number(rto) +
            Number(returnCost) +
            Number(advertisementCost) +
            Number(delivery) +
            Number(others);



        const withGST = breakEven * (1 + gst / 100);

        return Number(withGST.toFixed(0));
    };


    const handleSizeUpdate = async (
        item,
        sizeKey,
        field,
        value,
        forceUpdate = false
    ) => {

        if (!canEditStock(item)) {
            alert("You are not authorized");
            return;
        }

        try {

            const updatedSizes = { ...item.sizes };
            const sizeData = updatedSizes[sizeKey];

            const newValue = Number(value);

            if (isNaN(newValue) || newValue < 0) return;

            if (field.startsWith("extraCosts.")) {

                const extraKey = field.split(".")[1];

                if (!sizeData.extraCosts) {
                    sizeData.extraCosts = {};
                }

                sizeData.extraCosts[extraKey] = newValue;

            } else {

                sizeData[field] = newValue;

            }

            // ensure extraCosts exists
            if (!sizeData.extraCosts) {
                sizeData.extraCosts = {
                    packaging: 0,
                    labeling: 0,
                    rto: 0,
                    returnCost: 0,
                    advertisementCost: 0,
                    delivery: 0,
                    others: 0,
                    gst: 0
                };
            }

            // recalculate selling price
            sizeData.sellingPrice = getSellingPrice(
                sizeData.buyingPrice,
                sizeData.margin,
                sizeData.extraCosts
            );

            const newPrice = sizeData.sellingPrice;

            // update stock first
            await updateDoc(doc(db, "stocks", item.id), {
                sizes: updatedSizes
            });

            const qrQuery = query(
                collection(db, "qrcodes"),
                where("stockId", "==", item.id),
                where("size", "==", sizeKey),
                where("status", "==", "available")
            );

            const qrSnap = await getDocs(qrQuery);

            const qrToUpdate = qrSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 🔥 FIND ALL AVAILABLE QR
            // const qrToUpdate = (qrData[item.id] || []).filter(qr =>
            //     qr.stockId === item.id &&
            //     qr.size === sizeKey &&
            //     qr.status === "available"
            // );

            const batch = writeBatch(db);

            let skippedPrinted = 0;

            qrToUpdate.forEach((qr) => {

                // printed QR protected
                if (qr.printed && !forceUpdate) {
                    skippedPrinted++;
                    setForceQRPrint(prev => ({
                        ...prev,
                        [`${item.id}-${sizeKey}`]: true
                    }));
                    return;
                }

                batch.update(doc(db, "qrcodes", qr.id), {
                    sellingPrice: newPrice,

                    // 🔥 if force update -> mark for reprint
                    ...(forceUpdate && {
                        printed: false,
                        updatedAt: serverTimestamp(),
                        reprintRequired: true
                    })
                });
            });

            await batch.commit();
            await loadItemQR(item.id);

            if (skippedPrinted > 0) {
                alert(
                    `${skippedPrinted} printed QR skipped. Use FORCE UPDATE to update printed QR.`
                );
            }

        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    const handleStoreLinkUpdate = async (
        item,
        sizeKey,
        platform,
        value
    ) => {

        if (!canEditStock(item)) {
            alert("You are not authorized");
            return;
        }

        try {

            const updatedSizes = { ...item.sizes };

            if (!updatedSizes[sizeKey].storeLinks) {
                updatedSizes[sizeKey].storeLinks = {};
            }

            updatedSizes[sizeKey].storeLinks[platform] = value;

            await updateDoc(
                doc(db, "stocks", item.id),
                {
                    sizes: updatedSizes
                }
            );

        } catch (err) {

            console.error(err);
            alert("Failed to update store link");

        }
    };

    const getSoldCount = (item, size) => {
        return (qrData[item.id] || []).filter(qr =>
            qr.stockId === item.id &&
            qr.size === size &&
            qr.status === "sold"
        ).length;
    };

    const handleQtyChange = async (item, sizeKey, newQty) => {
        const updatedSizes = { ...item.sizes };
        const sizeData = updatedSizes[sizeKey];

        const soldCount = getSoldCount(item, sizeKey);

        // ❌ Prevent breaking QR system
        if (newQty < soldCount) {
            alert(`Cannot set qty below sold items (${soldCount})`);
            return;
        }

        const oldQty = sizeData.qty || 0;
        const oldInitial = sizeData.initialQty || 0;

        const diff = newQty - oldQty;

        sizeData.qty = newQty;

        // ✅ Only increase initialQty
        if (diff > 0) {
            sizeData.initialQty = oldInitial + diff;
        }

        await updateDoc(doc(db, "stocks", item.id), {
            sizes: updatedSizes
        });
    };

    const handleAddStock = async (item, sizeKey, amount) => {

        if (!canEditStock(item)) {
            alert("You are not authorized");
            return;
        }

        const confirmReduce = window.confirm(
            `Add ${amount} item(s) from ${item.productName} (${sizeKey}). Please confirm befor Add ?`
        );

        if (!confirmReduce) return;

        // await createQRCodes(item, sizeKey, amount);

        await createQRCodes(
            item,
            sizeKey,
            amount,
            {
                isOnlineItem: true
            }
        );

        const updatedSizes = { ...item.sizes };
        const sizeData = updatedSizes[sizeKey];


        sizeData.qty = (sizeData.qty || 0) + amount;
        sizeData.initialQty = (sizeData.initialQty || 0) + amount;

        await updateDoc(doc(db, "stocks", item.id), {
            sizes: updatedSizes
        });

        await loadItemQR(item.id);
    };


    const handleReduceStock = async (item, sizeKey, amount) => {

        if (!canEditStock(item)) {
            alert("You are not authorized");
            return;
        }

        const confirmReduce = window.confirm(
            `Reduce ${amount} item(s) from ${item.productName} (${sizeKey}). Please confirm befor remove ?`
        );

        if (!confirmReduce) return;

        const availableQR = (qrData[item.id] || [])
            .filter(qr =>
                qr.stockId === item.id &&
                qr.size === sizeKey &&
                qr.status === "available"
            )
            .sort((a, b) => b.unitNo - a.unitNo); // latest first

        const toRemove = availableQR.slice(0, amount);

        for (let qr of toRemove) {
            await updateDoc(doc(db, "qrcodes", qr.id), {
                status: "removed"
            });
        }

        // update stock qty only
        const updatedSizes = { ...item.sizes };
        updatedSizes[sizeKey].qty -= amount;

        await updateDoc(doc(db, "stocks", item.id), {
            sizes: updatedSizes
        });

        await loadItemQR(item.id);
    };


    const userList = [
        ...new Map(
            stocks
                .filter(item => item.userId)
                .map(item => [
                    item.userId,
                    {
                        userId: item.userId,
                        userName: item.createdBy?.name,
                        userShopName: item.createdBy?.shopName,
                        userMobile: item.createdBy?.mobile,
                        userEmail: item.createdBy?.email,
                    }
                ])
        ).values()
    ];

    // const filteredStocks = stocks.filter(item => {

    //     // ========================================
    //     // POPULARITY FILTER
    //     // ========================================

    //     const matchesPopularity =
    //         !popularityFilter ||
    //         item.catalogPopularity === popularityFilter;

    //     // ========================================
    //     // USER FILTER
    //     // ========================================

    //     const matchesUser =
    //         role !== "admin" &&
    //             role !== "superadmin"
    //             ? true
    //             : selectedUser === "all"
    //                 ? true
    //                 : item.userId === selectedUser;

    //     // ========================================
    //     // CATALOG SEARCH
    //     // ========================================

    //     const matchesCatalog =
    //         !searchId ||
    //         item.catalogId
    //             ?.toUpperCase()
    //             .includes(searchId.toUpperCase());

    //     // ========================================
    //     // FINAL
    //     // ========================================

    //     return (
    //         matchesPopularity &&
    //         matchesUser &&
    //         matchesCatalog
    //     );
    // });

    const filteredStocks = useMemo(() => {

        return stocks.filter(item => {

            const matchesPopularity =
                !popularityFilter ||
                item.catalogPopularity === popularityFilter;

            const matchesUser =
                role !== "admin" &&
                    role !== "superadmin"
                    ? true
                    : selectedUser === "all"
                        ? true
                        : item.userId === selectedUser;

            const matchesCatalog =
                !searchId ||
                item.catalogId
                    ?.toUpperCase()
                    .includes(searchId.toUpperCase());

            return (
                matchesPopularity &&
                matchesUser &&
                matchesCatalog
            );
        });

    }, [
        stocks,
        popularityFilter,
        selectedUser,
        searchId,
        role
    ]);

    // const getItemQR = (item) => {
    //     return qrData.filter(qr =>
    //         qr.stockId === item.id &&
    //         qr.status === "available"
    //     );
    // };

    const getItemQR = (item) => {
        return (qrData[item.id] || []).filter(
            qr => qr.status === "available"
        );
    };

    const handlePrint = async (item) => {
        const qrs = getItemQR(item);

        for (const qr of qrs) {
            await updateDoc(doc(db, "qrcodes", qr.id), {
                printed: true
            });
        }

        window.print();
    };

    const handleForceQRUpdate = async (item, sizeKey) => {

        if (!canEditStock(item)) {
            alert("Unauthorized");
            return;
        }

        const confirmForce = window.confirm(
            "Update ALL QR prices and mark them for reprint?"
        );

        if (!confirmForce) return;

        try {

            const newPrice = item.sizes[sizeKey].sellingPrice;

            const qrs = (qrData[item.id] || []).filter(qr =>
                qr.stockId === item.id &&
                qr.size === sizeKey &&
                qr.status === "available"
            );

            const batch = writeBatch(db);

            qrs.forEach((qr) => {

                batch.update(doc(db, "qrcodes", qr.id), {
                    sellingPrice: newPrice,
                    printed: false,
                    reprintRequired: true,
                    updatedAt: serverTimestamp()
                });

            });

            await batch.commit();

            alert("QR updated successfully. Reprint required.");
            setForceQRPrint(prev => ({
                ...prev,
                [`${item.id}-${sizeKey}`]: false
            }));

        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    const sortSizes = (sizes = {}) => {

        return Object.entries(sizes).sort(([sizeA], [sizeB]) => {

            const a = String(sizeA).trim().toUpperCase();
            const b = String(sizeB).trim().toUpperCase();

            const indexA = MASTER_SIZE_ORDER.indexOf(a);
            const indexB = MASTER_SIZE_ORDER.indexOf(b);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }

            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            const meterRegex = /^(\d+(\.\d+)?)\s*METER$/i;

            const meterA = a.match(meterRegex);
            const meterB = b.match(meterRegex);

            if (meterA && meterB) {
                return parseFloat(meterA[1]) - parseFloat(meterB[1]);
            }

            const numA = parseFloat(a);
            const numB = parseFloat(b);

            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }

            return a.localeCompare(b, undefined, {
                numeric: true,
                sensitivity: "base"
            });
        });
    };

    const getCatalogPopularity = (catalogId) => {

        const soldCount =
            salesMap[catalogId] || 0;

        if (soldCount >= 100) {
            return "High";
        }

        if (soldCount >= 50) {
            return "Mid";
        }

        return "Low";
    };

    // const getCatalogPopularity = (catalogId) => {

    //     const salesMap = {};

    //     qrDataFlat.forEach(qr => {

    //         if (qr.status !== "sold") return;

    //         salesMap[qr.catalogId] =
    //             (salesMap[qr.catalogId] || 0) + 1;
    //     });

    //     const values = Object.values(salesMap);

    //     const max = Math.max(...values, 1);

    //     const sold = salesMap[catalogId] || 0;

    //     const ratio = sold / max;

    //     if (ratio >= 0.7) return "High";
    //     if (ratio >= 0.3) return "Mid";

    //     return "Low";
    // };

    const getStockFlag = (sizes = {}) => {

        const totalQty = Object.values(sizes).reduce(
            (sum, s) => sum + (s.qty || 0),
            0
        );

        if (totalQty <= 0) {
            return {
                label: "Out of Stock",
                color: "#dc2626",
                bg: "#fee2e2",
                icon: "❌"
            };
        }

        if (totalQty < 50) {
            return {
                label: "Low Stock",
                color: "#92400e",
                bg: "#fef3c7",
                icon: "⚠️"
            };
        }

        return {
            label: "In Stock",
            color: "#166534",
            bg: "#dcfce7",
            icon: "✅"
        };
    };

    const ITEMS_PER_PAGE = 10;

    const [currentPage, setCurrentPage] = useState(1);

    const paginatedStocks = useMemo(() => {

        const start =
            (currentPage - 1) * ITEMS_PER_PAGE;

        return filteredStocks.slice(
            start,
            start + ITEMS_PER_PAGE
        );

    }, [filteredStocks, currentPage]);

    return (
        <div className="stock-page" >

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "15px",
                    marginBottom: "25px",
                    padding: "25px",
                    borderRadius: "30px",
                    background:
                        "linear-gradient(135deg,#0f172a,#111827)",
                    color: "#fff",
                    boxShadow:
                        "0 20px 40px rgba(0,0,0,0.18)"
                }}
            >

                {/* LEFT */}
                <div>

                    <h1
                        style={{
                            margin: 0,
                            fontSize: "38px",
                            fontWeight: "900"
                        }}
                    >
                        📦 Inventory Intelligence
                    </h1>

                    <p
                        style={{
                            marginTop: "8px",
                            color: "#94a3b8",
                            fontSize: "15px"
                        }}
                    >
                        Manage stock, QR systems, pricing,
                        marketplace links & inventory analytics
                    </p>
                </div>

                {/* RIGHT */}
                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap"
                    }}
                >

                    <div
                        style={{
                            background:
                                "rgba(255,255,255,0.08)",
                            padding: "14px 18px",
                            borderRadius: "18px",
                            minWidth: "140px"
                        }}
                    >
                        <small
                            style={{
                                color: "#94a3b8"
                            }}
                        >
                            Total Catalogs
                        </small>

                        <h2
                            style={{
                                margin: "5px 0 0"
                            }}
                        >
                            {filteredStocks.length}
                        </h2>
                    </div>

                    <div
                        style={{
                            background:
                                "rgba(255,255,255,0.08)",
                            padding: "14px 18px",
                            borderRadius: "18px",
                            minWidth: "140px"
                        }}
                    >
                        <small
                            style={{
                                color: "#94a3b8"
                            }}
                        >
                            Total Qty
                        </small>

                        <h2
                            style={{
                                margin: "5px 0 0"
                            }}
                        >
                            {filteredStocks.reduce(
                                (a, b) =>
                                    a + (b.totalQty || 0),
                                0
                            )}
                        </h2>
                    </div>

                    <div
                        style={{
                            background:
                                "rgba(34,197,94,0.12)",
                            color: "#4ade80",
                            padding: "14px 18px",
                            borderRadius: "18px",
                            minWidth: "160px"
                        }}
                    >
                        <small
                            style={{
                                color: "#bbf7d0"
                            }}
                        >
                            Inventory Value
                        </small>

                        <h2
                            style={{
                                margin: "5px 0 0"
                            }}
                        >
                            ₹{
                                filteredStocks
                                    .reduce(
                                        (a, b) =>
                                            a +
                                            (b.totalSelling || 0),
                                        0
                                    )
                                    .toFixed(0)
                            }
                        </h2>
                    </div>

                </div>

            </div>
            <StockSummary stocks={filteredStocks} user={user} />

            <>
                <button className="summary-card" style={{ color: "white" }} onClick={() => setShowInventory(true)}>
                    + Add New Catalog
                </button>

                <FeatureGate
                    user={user}
                    feature="marketplaceIntegrations"
                    title="Marketplace Integrations"
                    description="Upgrade your plan to unlock Marketplace Integrations."
                >
                    {/* <button className="summary-card" style={{ color: "white" }} onClick={() => navigate("/marketplace-integrations")} >
                        Marketplace Integrations
                    </button> */}

                    <button className="summary-card" style={{ color: "white" }}
                        onClick={() =>
                            navigate("/marketplace-csv-import",
                                {
                                    state: {
                                        type: "inventory"
                                    }
                                })}
                    >
                        Marketplace Inventory CSV Import
                    </button>
                    <button className="summary-card" style={{ color: "white" }}
                        onClick={() =>
                            navigate("/marketplace-csv-import",
                                {
                                    state: {
                                        type: "pricing"
                                    }
                                })}
                    >
                        Marketplace Price CSV Import
                    </button>
                </FeatureGate>


                {user && showInventory && (
                    <div className="modal-overlay">
                        <div className="modal-box">

                            {/* Header */}
                            <div className="modal-header">
                                <h3>Add New Items</h3>
                                <button className="close-btn" onClick={() => setShowInventory(false)}>❌</button>
                            </div>

                            {/* Content */}
                            <div className="modal-content" >
                                <StockInventory user={user} />
                            </div>

                        </div>
                    </div>
                )}
            </>

            <div style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
                // marginBottom: "15px",
                width: "100%"
            }}>

                <input
                    placeholder="Search by Catalog ID..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                    style={{ marginBottom: "15px", padding: "8px", width: "250px" }}
                    className="summary-card"
                />

                <FeatureGate
                    user={user}
                    feature="tools"
                    title="Easy Searching Bar"
                    description="Upgrade your plan to unlock Easy Searching Tools Bar."
                >
                    <div style={{ display: "flex" }}>
                        {/* 👤 User Filter */}
                        {(role === "admin" || role === "superadmin") && (
                            <div>
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    style={{

                                        color: "#fff",
                                        width: "50%",
                                    }}
                                    className="summary-card"

                                >

                                    <option
                                        value={user?.uid}
                                    >
                                        My Stocks
                                    </option>

                                    <option
                                        value="all"
                                    >
                                        All Users
                                    </option>

                                    {userList.map((u) => (
                                        <option
                                            key={u.userId}
                                            value={u.userId}
                                        >
                                            {u.userShopName}: ({u.userName} - {u.userEmail} - {u.userMobile})
                                        </option>
                                    ))}

                                </select>
                            </div>
                        )}

                        <select
                            value={popularityFilter}
                            onChange={(e) =>
                                setPopularityFilter(e.target.value)
                            }
                            className="summary-card"
                            style={{ color: "white" }}

                        >
                            <option value="">
                                All Popularity
                            </option>

                            <option value="High">
                                High
                            </option>

                            <option value="Mid">
                                Mid
                            </option>

                            <option value="Low">
                                Low
                            </option>
                        </select>
                    </div>

                    {
                        (role === "superadmin" || role === "user") && (
                            <button
                                onClick={handleDeleteFilteredStocks}
                                disabled={
                                    deleteProgress.active ||
                                    filteredStocks.length === 0
                                }
                                className="summary-card"
                                style={{
                                    background: "#dc2626",
                                    color: "white",
                                    cursor: "pointer"
                                }}
                            >
                                🗑 Delete Filtered (
                                {filteredStocks.length}
                                )
                            </button>
                        )
                    }

                </FeatureGate>

            </div>
            {
                deleteProgress.active && (
                    <div
                        style={{
                            width: "100%",
                            marginBottom: "15px",
                            padding: "10px",
                            border: "1px solid #ef4444",
                            borderRadius: "10px",
                            background: "#1f2937"
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "8px",
                                fontSize: "13px",
                                color: "white"
                            }}
                        >
                            <span>
                                Deleted:
                                {" "}
                                {deleteProgress.completed}
                                /
                                {deleteProgress.total}
                            </span>

                            <span>
                                Current:
                                {" "}
                                {deleteProgress.current || "-"}
                            </span>
                        </div>

                        <div
                            style={{
                                width: "100%",
                                height: "14px",
                                background: "#374151",
                                borderRadius: "999px",
                                overflow: "hidden"
                            }}
                        >
                            <div
                                style={{
                                    width: `${deleteProgress.total
                                        ? (
                                            deleteProgress.completed /
                                            deleteProgress.total
                                        ) * 100
                                        : 0
                                        }%`,
                                    height: "100%",
                                    background: "#ef4444",
                                    transition: "0.3s"
                                }}
                            />
                        </div>

                    </div>
                )
            }
            <FeatureGate
                user={user}
                feature="stockInventory"
                title="Stock List"
                description="Upgrade your plan to unlock Stock List."
            >
                <div className="table-wrapper" >
                    {stockLoading ? (
                        <div
                            style={{
                                padding: "40px",
                                textAlign: "center",
                                fontSize: "18px",
                                fontWeight: "bold"
                            }}
                        >
                            Loading Stocks...
                        </div>
                    ) : (
                        <table className="stock-table" border="1" cellPadding="10" >
                            <thead>
                                <tr>
                                    <th>SL. No</th>
                                    {isAdmin && (
                                        <th>Shop Name</th>
                                    )}
                                    {isAdmin && (
                                        <th>Proprietor Name</th>
                                    )}
                                    <th>Product Name</th>
                                    <th>Product ID</th>
                                    <th>Catalog ID</th>
                                    <th>Sizes - Quantity - Prices - Margin%</th>
                                    <th>Total Qty</th>
                                    <th>Total Investment</th>
                                    <th>Total Extra Cost</th>
                                    <th>Avg Selling Price</th>
                                    <th>Total Selling Value</th>
                                    <th>Profit</th>
                                    {/* <th>QR Codes</th> */}
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {paginatedStocks.map((item, idx) => {
                                    const qrCodes = getItemQR(item);
                                    const editable = canEditStock(item);
                                    const stockFlag = getStockFlag(item.sizes);
                                    const soldCount =
                                        salesMap[item.catalogId] || 0;

                                    return (
                                        <tr key={item.id} className={
                                            stockFlag.label === "Low Stock"
                                                ? "low-stock"
                                                : ""
                                        }>
                                            <td>{idx + 1}</td>
                                            {isAdmin && (
                                                <td>{item.createdBy?.shopName || "N/A"}</td>
                                            )}
                                            {isAdmin && (
                                                <td>{item.createdBy?.name || "N/A"}</td>
                                            )}
                                            <td>{item.productName}</td>
                                            <td>{item.productId}</td>
                                            <td>{item.catalogId}
                                                <span style={{ whiteSpace: "nowrap" }}>
                                                    <span
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: "20px",
                                                            fontSize: "11px",
                                                            fontWeight: "bold",

                                                            background:
                                                                item.catalogPopularity === "High"
                                                                    ? "#dcfce7"
                                                                    : item.catalogPopularity === "Mid"
                                                                        ? "#fef3c7"
                                                                        : "#fee2e2",

                                                            color:
                                                                item.catalogPopularity === "High"
                                                                    ? "#166534"
                                                                    : item.catalogPopularity === "Mid"
                                                                        ? "#92400e"
                                                                        : "#991b1b"
                                                        }}
                                                    >
                                                        {
                                                            item.catalogPopularity === "High"
                                                                ? `🔥 High (sold:${soldCount})`
                                                                : item.catalogPopularity === "Mid"
                                                                    ? `⭐ Mid(sold:${soldCount})`
                                                                    : `📦 Low(sold:${soldCount})`
                                                        }
                                                        <span
                                                            style={{
                                                                padding: "4px 10px",
                                                                borderRadius: "20px",
                                                                fontSize: "11px",
                                                                fontWeight: "bold",
                                                                background: stockFlag.bg,
                                                                color: stockFlag.color,
                                                                marginLeft: "5px"
                                                            }}
                                                        >
                                                            {stockFlag.icon} {stockFlag.label}
                                                        </span>
                                                        {/* <select
                                                        value={item.catalogPopularity || "Low"}
                                                        onChange={async (e) => {

                                                            await updateDoc(
                                                                doc(db, "stocks", item.id),
                                                                {
                                                                    catalogPopularity:
                                                                        e.target.value
                                                                }
                                                            );
                                                        }}
                                                        disabled={!editable}
                                                    >
                                                        <option value="Low">
                                                            Low
                                                        </option>

                                                        <option value="Mid">
                                                            Mid
                                                        </option>

                                                        <option value="High">
                                                            High
                                                        </option>
                                                    </select> */}
                                                    </span>
                                                </span>

                                            </td>


                                            <td>
                                                <div style={{ overflowY: "auto", maxHeight: "365px", scrollbarWidth: "thin" }}
                                                >
                                                    {sortSizes(item.sizes).map(([size, data]) => {

                                                        const soldCount = getSoldCount(item, size);
                                                        const total = data.initialQty ?? 0;
                                                        const available = data.qty ?? 0;
                                                        const removedCount = (qrData[item.id] || []).reduce((count, qr) => {
                                                            if (
                                                                qr.stockId === item.id &&
                                                                qr.size === size &&
                                                                qr.status === "removed"
                                                            ) {
                                                                return count + 1;
                                                            }
                                                            return count;
                                                        }, 0);
                                                        const sizeQRs = (qrData[item.id] || []).filter(
                                                            qr =>
                                                                qr.stockId === item.id &&
                                                                qr.size === size &&
                                                                qr.status === "available"
                                                        );

                                                        return (
                                                            <div clas key={size} style={{ marginBottom: "8px", alignItems: "center", gap: "5px", border: "1px solid #3b82f6", padding: "5px 10px", borderRadius: "5px", }}
                                                                onMouseMove={(e) => {
                                                                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(54, 238, 79, 0.59)";
                                                                    e.currentTarget.style.backgroundColor = "#372983"
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.boxShadow = "";
                                                                    e.currentTarget.style.backgroundColor = ""
                                                                }}
                                                            >
                                                                <label><strong>Size: {size}</strong></label>
                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "5px", fontSize: "12px" }}>
                                                                    <span style={{ marginLeft: "8px" }}>
                                                                        <small>Listing Price:</small> ₹{(data.sellingPrice || 0).toFixed(2)}<small>/Unit</small>
                                                                    </span>
                                                                    |
                                                                    <span>
                                                                        <small>Extra Cost:</small> ₹
                                                                        {(
                                                                            (data.extraCosts.packaging +
                                                                                data.extraCosts.labeling +
                                                                                data.extraCosts.rto +
                                                                                data.extraCosts.returnCost +
                                                                                data.extraCosts.advertisementCost +
                                                                                data.extraCosts.delivery +
                                                                                data.extraCosts.others) || 0
                                                                        ).toFixed(2)}
                                                                        <small>/Unit</small>
                                                                    </span>
                                                                    |
                                                                    <span>
                                                                        <small>Gst Amount:</small> ₹
                                                                        {
                                                                            ((((data.buyingPrice * (1 + data.margin / 100)) +
                                                                                (
                                                                                    data.extraCosts.packaging +
                                                                                    data.extraCosts.labeling +
                                                                                    data.extraCosts.rto +
                                                                                    data.extraCosts.returnCost +
                                                                                    data.extraCosts.advertisementCost +
                                                                                    data.extraCosts.delivery +
                                                                                    data.extraCosts.others
                                                                                )) * data.extraCosts.gst) / 100).toFixed(2)
                                                                        }
                                                                        <small>/Unit</small>
                                                                    </span>
                                                                    |
                                                                    <span><small>Profit:</small> ₹{((data.buyingPrice * data.margin) / 100).toFixed(2)}<small>/Unit</small></span>
                                                                    {data.sellingPrice <
                                                                        data.buyingPrice && (
                                                                            <span style={{ color: "red", fontSize: "10px" }}>
                                                                                ⚠ Loss
                                                                            </span>
                                                                        )}
                                                                    |

                                                                    <div
                                                                        key={size}
                                                                        style={{
                                                                            border: "1px solid #3b82f6",
                                                                            borderRadius: "8px",
                                                                            padding: "8px",
                                                                            // boxShadow: "0 6px 20px rgba(54, 180, 238, 0.59)",
                                                                        }}
                                                                        onMouseMove={(e) => e.currentTarget.style.boxShadow = "0 6px 20px rgba(54, 180, 238, 0.59)"}
                                                                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = ""}
                                                                    >

                                                                        <div
                                                                            style={{
                                                                                display: "flex",
                                                                                justifyContent: "space-between",
                                                                                alignItems: "center",
                                                                                gap: "10px",
                                                                                flexWrap: "wrap"
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    display: "flex",
                                                                                    gap: "6px",
                                                                                    flexWrap: "wrap"
                                                                                }}
                                                                            >

                                                                                <button
                                                                                    onClick={async () => {

                                                                                        if (!qrData[item.id]) {
                                                                                            await loadItemQR(item.id);
                                                                                        }

                                                                                        setSizeQrPopup({
                                                                                            open: true,
                                                                                            item,
                                                                                            size
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    👁QR({sizeQRs.length})
                                                                                </button>

                                                                                {forceQRPrint[`${item.id}-${size}`] && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleForceQRUpdate(item, size)
                                                                                        }
                                                                                        style={{
                                                                                            background: "red",
                                                                                            color: "white"
                                                                                        }}
                                                                                    >
                                                                                        🔄QR
                                                                                    </button>
                                                                                )}

                                                                            </div>

                                                                        </div>

                                                                    </div>

                                                                    <button
                                                                        onClick={async () => {
                                                                            const updatedSizes = { ...item.sizes };
                                                                            if (!window.confirm(`Delete ${size} ?`)) return;

                                                                            delete updatedSizes[size];

                                                                            if (Object.keys(updatedSizes).length === 0) {
                                                                                alert("At least one size required");
                                                                                return;
                                                                            }
                                                                            if (user.uid !== item.userId) {
                                                                                alert("You are not authorizes");
                                                                                return
                                                                            }
                                                                            await updateDoc(doc(db, "stocks", item.id), {
                                                                                sizes: updatedSizes
                                                                            });
                                                                        }}
                                                                        style={{ marginLeft: "5px", background: "#ffffff02" }}
                                                                        onMouseMove={(e) => e.currentTarget.style.boxShadow = "0 6px 20px rgba(238, 66, 54, 0.59)"}
                                                                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = ""}
                                                                        disabled={!editable}
                                                                    >
                                                                        ❌
                                                                    </button>


                                                                </div>

                                                                <div style={{ fontSize: "10px", color: "gray" }}>
                                                                    Sold: {soldCount} | Available: {available} | Total: {total} | Removed: {removedCount}
                                                                </div>
                                                                <div key={size} style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>

                                                                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                                                                        <legend style={{ fontSize: "10px", color: "gray", whiteSpace: "nowrap" }}>Qty:-
                                                                            <button
                                                                                onClick={() => handleReduceStock(item, size, 1)}
                                                                                style={{ padding: "2px 2px" }}
                                                                                disabled={!editable}
                                                                            >
                                                                                ➖
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                value={data.qty}
                                                                                readOnly
                                                                                style={{ width: "60px", marginLeft: "5px", marginLeft: "2px" }}
                                                                            />
                                                                            <button
                                                                                style={{ padding: "2px 2px" }}
                                                                                onClick={() => handleAddStock(item, size, 1)}
                                                                                disabled={!editable}
                                                                            >
                                                                                ➕
                                                                            </button>
                                                                        </legend>
                                                                        <legend style={{ fontSize: "10px", color: "gray", whiteSpace: "nowrap" }}>Buy:-
                                                                            <input
                                                                                type="number"
                                                                                value={data.buyingPrice || 0}
                                                                                placeholder="Buy"
                                                                                style={{ width: "70px", marginLeft: "5px" }}
                                                                                onChange={(e) =>
                                                                                    handleSizeUpdate(item, size, "buyingPrice", e.target.value)
                                                                                }
                                                                                disabled={!editable}
                                                                            />
                                                                        </legend>
                                                                        <legend style={{ fontSize: "10px", color: "gray", whiteSpace: "nowrap" }}>Margin%:-
                                                                            <input
                                                                                type="number"
                                                                                value={data.margin || 0}
                                                                                placeholder="%"
                                                                                style={{ width: "60px", marginLeft: "5px" }}
                                                                                onChange={(e) =>
                                                                                    handleSizeUpdate(item, size, "margin", e.target.value)
                                                                                }
                                                                                disabled={!editable}
                                                                            />
                                                                        </legend>
                                                                    </div>
                                                                    <div style={{
                                                                        display: "grid",
                                                                        gridTemplateColumns: "repeat(4, 1fr)", // ✅ 5 columns
                                                                        gap: "6px",
                                                                        marginTop: "6px",
                                                                        borderTop: "1px dashed #ccc",
                                                                        paddingTop: "6px",
                                                                        width: "100%"
                                                                    }}>
                                                                        {["packaging", "labeling", "rto", "returnCost", "advertisementCost", "delivery", "others", "gst"].map((key) => (
                                                                            <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                                                <legend key={key} style={{ fontSize: "10px", color: "gray" }}>{key.toUpperCase()}</legend>
                                                                                <input
                                                                                    key={key}
                                                                                    type="number"
                                                                                    placeholder={key}
                                                                                    value={data.extraCosts?.[key] || 0}
                                                                                    style={{ width: "65px", fontSize: "10px" }}
                                                                                    onChange={(e) =>
                                                                                        handleSizeUpdate(
                                                                                            item,
                                                                                            size,
                                                                                            `extraCosts.${key}`,
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                    disabled={!editable}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    {/* =======================================
                                                                               ONLINE STORE LINKS
                                                                            ======================================= */}

                                                                    <div
                                                                        style={{
                                                                            marginTop: "10px",
                                                                            borderTop: "1px dashed #555",
                                                                            paddingTop: "10px",
                                                                            overflowY: "auto",
                                                                            maxHeight: "100px",
                                                                            width: "100%",
                                                                            scrollbarWidth: "thin"
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                fontWeight: "bold",
                                                                                fontSize: "13px",
                                                                                color: "#3b82f6",
                                                                                position: "sticky",
                                                                                top: 0,
                                                                            }}
                                                                        >
                                                                            🌐 Online Store Links
                                                                        </div>

                                                                        <div
                                                                            style={{
                                                                                fontWeight: "bold",
                                                                                // marginBottom: "8px",
                                                                                fontSize: "13px",
                                                                                color: "#3b82f6",
                                                                                padding: "10px 10px"
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    display: "flex",
                                                                                    justifyContent: "space-between",
                                                                                    alignItems: "center",
                                                                                    flexWrap: "wrap",
                                                                                    gap: "8px"
                                                                                }}
                                                                            >
                                                                                <button
                                                                                    onClick={() => {

                                                                                        Object.values(
                                                                                            data.storeLinks || {}
                                                                                        ).forEach((link) => {

                                                                                            if (isValidUrl(link)) {

                                                                                                window.open(
                                                                                                    normalizeUrl(link),
                                                                                                    "_blank"
                                                                                                );

                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    style={{
                                                                                        padding: "5px 10px",
                                                                                        border: "none",
                                                                                        borderRadius: "5px",
                                                                                        background: "#059669",
                                                                                        color: "#fff",
                                                                                        cursor: "pointer",
                                                                                        fontSize: "11px"
                                                                                    }}
                                                                                >
                                                                                    🚀 Open All
                                                                                </button>

                                                                            </div>
                                                                        </div>

                                                                        <div
                                                                            style={{
                                                                                display: "grid",
                                                                                gridTemplateColumns:
                                                                                    "repeat(auto-fit,minmax(220px,1fr))",
                                                                                gap: "8px"
                                                                            }}
                                                                        >

                                                                            {storePlatforms.map((platform) => {

                                                                                const link =
                                                                                    data.storeLinks?.[platform.key] || "";

                                                                                return (

                                                                                    <div
                                                                                        key={platform.key}
                                                                                        style={{
                                                                                            border: "1px solid #333",
                                                                                            borderRadius: "8px",
                                                                                            padding: "8px",
                                                                                            background: "#111827"
                                                                                        }}
                                                                                    >

                                                                                        <div
                                                                                            style={{
                                                                                                fontSize: "12px",
                                                                                                marginBottom: "5px",
                                                                                                fontWeight: "bold"
                                                                                            }}
                                                                                        >
                                                                                            {platform.icon} {platform.label}
                                                                                        </div>

                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder={`${platform.label} Link`}
                                                                                            value={link}
                                                                                            onChange={(e) =>
                                                                                                handleStoreLinkUpdate(
                                                                                                    item,
                                                                                                    size,
                                                                                                    platform.key,
                                                                                                    e.target.value
                                                                                                )
                                                                                            }
                                                                                            disabled={!editable}
                                                                                            style={{
                                                                                                width: "95%",
                                                                                                padding: "6px",
                                                                                                fontSize: "11px",
                                                                                                marginBottom: "5px"
                                                                                            }}
                                                                                        />

                                                                                        {link && !isValidUrl(link) && (
                                                                                            <div
                                                                                                style={{
                                                                                                    color: "#ef4444",
                                                                                                    fontSize: "10px",
                                                                                                    marginBottom: "5px"
                                                                                                }}
                                                                                            >
                                                                                                Invalid URL
                                                                                            </div>
                                                                                        )}

                                                                                        <div
                                                                                            style={{
                                                                                                display: "flex",
                                                                                                gap: "5px"
                                                                                            }}
                                                                                        >

                                                                                            <button
                                                                                                onClick={() =>
                                                                                                    window.open(
                                                                                                        normalizeUrl(link),
                                                                                                        "_blank"
                                                                                                    )
                                                                                                }
                                                                                                disabled={!isValidUrl(link)}
                                                                                                style={{
                                                                                                    flex: 1,
                                                                                                    padding: "6px",
                                                                                                    cursor: isValidUrl(link)
                                                                                                        ? "pointer"
                                                                                                        : "not-allowed",
                                                                                                    background:
                                                                                                        isValidUrl(link)
                                                                                                            ? "#2563eb"
                                                                                                            : "#555",
                                                                                                    color: "#fff",
                                                                                                    border: "none",
                                                                                                    borderRadius: "5px"
                                                                                                }}
                                                                                            >
                                                                                                Open
                                                                                            </button>

                                                                                            <button
                                                                                                onClick={() =>
                                                                                                    copyToClipboard(
                                                                                                        normalizeUrl(link)
                                                                                                    )
                                                                                                }
                                                                                                disabled={!link}
                                                                                                style={{
                                                                                                    padding: "6px 10px",
                                                                                                    borderRadius: "5px",
                                                                                                    border: "none",
                                                                                                    cursor: link
                                                                                                        ? "pointer"
                                                                                                        : "not-allowed"
                                                                                                }}
                                                                                            >
                                                                                                📋
                                                                                            </button>

                                                                                        </div>

                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </td>

                                            <td>{item.totalQty}</td>
                                            <td>₹{item.totalInvestment.toFixed(2)}</td>
                                            <td>₹{item.totalExtraCost.toFixed(2)}</td>
                                            <td>₹{item.avgSelling.toFixed(2)}</td>
                                            <td>₹{item.totalSelling.toFixed(2)}</td>
                                            <td style={{
                                                color: item.profit < 0 ? "red" : "green",
                                                fontWeight: "bold"
                                            }}>
                                                ₹{item.profit.toFixed(2)}
                                            </td>
                                            <td>
                                                <button onClick={() => handleDelete(item)}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </FeatureGate>


            <div style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
                justifyContent: "center"
            }}>

                <button
                    disabled={currentPage === 1}
                    onClick={() =>
                        setCurrentPage(p => p - 1)
                    }
                >
                    Prev
                </button>

                <span>
                    Page {currentPage}/{Math.ceil(
                            filteredStocks.length /
                            ITEMS_PER_PAGE
                        )}
                </span>

                <button
                    disabled={
                        currentPage >=
                        Math.ceil(
                            filteredStocks.length /
                            ITEMS_PER_PAGE
                        )
                    }
                    onClick={() =>
                        setCurrentPage(p => p + 1)
                    }
                >
                    Next
                </button>

            </div>

            {sizeQrPopup.open && (
                <div className="qr-overlay">

                    <div className="qr-modal">

                        <h3>
                            {sizeQrPopup.item?.productName}
                        </h3>

                        <div>
                            Size:
                            {" "}
                            <b>{sizeQrPopup.size}</b>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "10px",
                                justifyContent: "center",
                                marginTop: "15px",
                                maxHeight: "70vh",
                                overflowY: "auto"
                            }}
                        >

                            {(qrData[sizeQrPopup.item?.id] || [])
                                .filter(qr =>
                                    qr.size === sizeQrPopup.size &&
                                    qr.status === "available"
                                )
                                .map((qr) => (

                                    <div
                                        key={qr.id}
                                        className={`qr-card ${!qr.printed ? "new" : ""}`}
                                        onClick={() =>
                                            setQrPopup({
                                                open: true,
                                                value: JSON.stringify(qr)
                                            })
                                        }
                                        style={{
                                            width: "130px",
                                            cursor: "pointer"
                                        }}
                                    >

                                        <QRCodeCanvas
                                            value={JSON.stringify(qr)}
                                            size={110}
                                            bgColor="#ffffff"
                                            fgColor="#000000"
                                            level="H"
                                            includeMargin={true}
                                        />

                                        {!qr.printed && (
                                            <div
                                                style={{
                                                    color: "green",
                                                    fontWeight: "bold",
                                                    fontSize: "10px"
                                                }}
                                            >
                                                NEW
                                            </div>
                                        )}

                                        {qr.reprintRequired && (
                                            <div
                                                style={{
                                                    color: "red",
                                                    fontWeight: "bold",
                                                    fontSize: "9px"
                                                }}
                                            >
                                                REPRINT
                                            </div>
                                        )}

                                        <div
                                            style={{
                                                fontWeight: "bold",
                                                fontSize: "11px"
                                            }}
                                        >
                                            {qr.productType}
                                        </div>

                                        <div style={{ fontSize: "10px" }}>
                                            {qr.color}
                                        </div>

                                        <div style={{ fontSize: "10px" }}>
                                            ₹{qr.sellingPrice}
                                        </div>

                                        <div style={{ fontSize: "9px" }}>
                                            #{qr.unitNo}
                                        </div>

                                    </div>
                                ))}

                        </div>

                        <div style={{ marginTop: "15px" }}>

                            <button
                                onClick={() => {
                                    setSelectedSize(sizeQrPopup.size);
                                    setPrintItem(sizeQrPopup.item);
                                }}
                            >
                                🖨 Print Size
                            </button>

                            <button
                                onClick={() =>
                                    setSizeQrPopup({
                                        open: false,
                                        item: null,
                                        size: ""
                                    })
                                }
                                style={{ marginLeft: "10px" }}
                            >
                                ❌ Close
                            </button>

                        </div>

                    </div>

                </div>
            )}


            {qrPopup.open && (
                <div className="qr-overlay">
                    <FeatureGate
                        user={user}
                        feature="qrCode"
                        title="QR Codes Visibility"
                        description="Upgrade your plan to unlock QR Codes Visibility."
                    >
                        <div className="qr-modal">

                            <h3>Scan QR Code</h3>
                            <FeatureGate
                                user={user}
                                feature="qrPrint"
                                title="QR Codes Visibility"
                                description="Upgrade your plan to unlock QR Codes Visibility."
                            >
                                <QRCodeCanvas
                                    value={qrPopup.value}
                                    size={280}
                                    className="print-area"
                                    bgColor="#ffffff"   // ✅ white background
                                    fgColor="#000000"   // ✅ black QR
                                    level="H"           // ✅ high error correction
                                    includeMargin={true} />
                            </FeatureGate>



                            {/* <p style={{ marginTop: 10 }}>{qrPopup.value}</p> */}
                            <div style={{ padding: "5px 5px" }} >
                                <button
                                    style={{ padding: "2px 5px", margin: "5px" }}
                                    onClick={async () => {

                                        try {

                                            const qrObj = JSON.parse(qrPopup.value);

                                            await updateDoc(
                                                doc(db, "qrcodes", qrObj.id),
                                                {
                                                    printed: true,
                                                    reprintRequired: false
                                                }
                                            );

                                            // 🔥 refresh local QR cache
                                            await loadItemQR(qrObj.stockId);

                                            window.print();

                                        } catch (err) {

                                            console.error(err);

                                        }
                                    }}
                                >
                                    Download
                                </button>

                                <button style={{ padding: "2px 5px", }} onClick={() => setQrPopup({ open: false, value: "" })}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </FeatureGate>

                </div>
            )}

            {printItem && (
                <div className="print-overlay" >
                    <div className="print-modal" >
                        <h3>QR Preview - {printItem.productName}</h3>
                        <select onChange={(e) => setSelectedSize(e.target.value)}>
                            <option value="ALL">All</option>
                            {Object.keys(printItem.sizes).map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        <button onClick={async () => {

                            if (!qrData[printItem.id]) {
                                await loadItemQR(printItem.id);
                            }

                            const qrs = getItemQR(printItem)
                                .filter(qr =>
                                    selectedSize === "ALL" ||
                                    qr.size === selectedSize
                                );

                            setPrintProgress({
                                total: qrs.length,
                                completed: 0,
                                active: true
                            });

                            try {

                                // 🔥 batch update
                                const batch = writeBatch(db);

                                qrs.forEach((qr, index) => {

                                    batch.update(doc(db, "qrcodes", qr.id), {
                                        printed: true,
                                        reprintRequired: false
                                    });

                                    // fake live progress
                                    setTimeout(() => {

                                        setPrintProgress({
                                            total: qrs.length,
                                            completed: index + 1,
                                            active: true
                                        });

                                    }, index * 5);

                                });

                                // 🔥 single firestore request
                                await batch.commit();
                                await loadItemQR(printItem.id);

                                setPrintProgress({
                                    total: qrs.length,
                                    completed: qrs.length,
                                    active: true
                                });

                                setTimeout(() => {

                                    setPrintProgress({
                                        total: 0,
                                        completed: 0,
                                        active: false
                                    });

                                    window.print();

                                }, 300);

                            } catch (err) {

                                console.error(err);
                                alert("Print update failed");

                                setPrintProgress({
                                    total: 0,
                                    completed: 0,
                                    active: false
                                });
                            }

                        }}>
                            🖨 Print
                        </button>
                        <button onClick={() => setPrintItem(null)}>❌ Close</button>

                        {printProgress.active && (
                            <div
                                style={{
                                    width: "100%",
                                    marginBottom: "15px"
                                }}
                            >

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: "5px",
                                        fontSize: "12px"
                                    }}
                                >
                                    <span>
                                        Completed: {printProgress.completed}
                                    </span>

                                    <span>
                                        Pending:
                                        {" "}
                                        {printProgress.total - printProgress.completed}
                                    </span>
                                </div>

                                <div
                                    style={{
                                        width: "100%",
                                        height: "12px",
                                        background: "#ddd",
                                        borderRadius: "10px",
                                        overflow: "hidden"
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${(
                                                printProgress.completed /
                                                printProgress.total
                                            ) * 100}%`,
                                            height: "100%",
                                            background: "#22c55e",
                                            transition: "0.3s"
                                        }}
                                    />
                                </div>

                            </div>
                        )}
                        <FeatureGate
                            user={user}
                            feature="bulkPrint"
                            title="Bulk QR Printing"
                            description="Upgrade your plan to unlock Bulk QR Printing System."
                        >
                            <div className="print-area" >
                                {getItemQR(printItem)
                                    .filter(qr => selectedSize === "ALL" || qr.size === selectedSize)
                                    .map((qr, index) => {

                                        return (
                                            <div key={qr.id}
                                                className="qr-box" style={{ width: "170px" }} >
                                                <div className={`qr-card ${!qr.printed ? "new" : ""}`} style={{ width: "160px", background: !qr.printed ? "" : "white" }}>
                                                    <div style={{ color: !qr.printed ? "" : "black" }} >
                                                        <b>{qr.productType}</b>-
                                                        {qr.color}-
                                                        Size: {qr.size}
                                                    </div>
                                                    <QRCodeCanvas
                                                        value={JSON.stringify(qr)}
                                                        size={150}
                                                        bgColor="#ffffff"   // ✅ white background
                                                        fgColor="#000000"   // ✅ black QR
                                                        level="H"           // ✅ high error correction
                                                        includeMargin={true}
                                                    />
                                                    <div style={{ color: !qr.printed ? "" : "black" }} >
                                                        #{qr.unitNo}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </FeatureGate>

                    </div>
                </div>
            )}
        </div>
    );
};

export default StockList;
