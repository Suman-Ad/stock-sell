import React, { useState } from "react";
import Papa from "papaparse";
import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
    writeBatch,
    updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";
import { useLocation } from "react-router-dom";

const parseCSVDate = (dateStr) => {

    try {

        if (!dateStr) {
            return new Date();
        }

        // Excel serial number
        if (!isNaN(dateStr)) {

            const excelDate =
                new Date(
                    (Number(dateStr) - 25569) * 86400 * 1000
                );

            return isNaN(excelDate.getTime())
                ? new Date()
                : excelDate;
        }

        const parts =
            String(dateStr)
                .trim()
                .split("/");

        // M/D/YYYY
        if (parts.length === 3) {

            const [month, day, year] = parts;

            const parsedDate =
                new Date(
                    Number(year),
                    Number(month) - 1,
                    Number(day)
                );

            return isNaN(parsedDate.getTime())
                ? new Date()
                : parsedDate;
        }

        // fallback
        const fallbackDate =
            new Date(dateStr);

        return isNaN(fallbackDate.getTime())
            ? new Date()
            : fallbackDate;

    } catch (err) {

        console.error(
            "Date parse failed:",
            err
        );

        return new Date();
    }
};


const createQRCodes = async ({
    batchRef,
    operationRef,
    commitBatch,
    item,
    sizeKey,
    quantity,
    options = {}
}) => {

    const sizeData = item.sizes[sizeKey];

    const currentQty =
        Number(sizeData.qty || 0);

    const start =
        currentQty - quantity;

    for (let i = 1; i <= quantity; i++) {

        if (operationRef.current >= 450) {
            await commitBatch();
        }

        const unitNo = start + i;

        const ref =
            doc(collection(db, "qrcodes"));

        batchRef.current.set(ref, {

            stockId: item.id,

            productName:
                item.productName,

            productId:
                item.productId,

            catalogId:
                item.catalogId,

            category:
                item.category || "",

            subCategory:
                item.subCategory || "",

            productType:
                item.productType || "",

            size: sizeKey,

            color:
                item.color || "",

            unitNo,

            uniqueId:
                `${item.productId}-${sizeKey}-${item.id}-${unitNo}`,

            sellingPrice:
                sizeData.sellingPrice || 0,

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

            createdAt:
                serverTimestamp()
        });

        operationRef.current++;
    }
};

const normalizeSize = (size = "") => {

    return String(size)
        .trim()
        .toUpperCase()
        .replace(/MONTHS/g, "M")
        .replace(/YEARS/g, "Y")
        .replace(/\s+/g, "")
        .replace(/[^A-Z0-9\-]/g, "");
};

const internalFields = {

    orders: [
        "orderId",
        "catalogId",
        "productName",
        "productId",
        "size",
        "qty",
        "sellingPrice",
        "customerName",
        "phone",
        "awb",
        "orderStatus",
        "soldAt"
    ],

    inventory: [
        "catalogId",
        "productName",
        "productId",
        "size",
        "qty",
        "buyingPrice",
        "sellingPrice"
    ],

    pricing: [
        "catalogId",
        "productId",
        "size",
        "buyingPrice",
        "sellingPrice",
        "margin"
    ]
};

const importProfiles = {

    meesho: {

        orders: {

            orderId: [
                "Sub Order No",
                "Order ID"
            ],

            orderDate: [
                "Order Date",
                "Date",
                "date"
            ],

            catalogId: [
                "SKU",
                "Seller SKU"
            ],

            productName: [
                "Product Name",
                "Style ID",
            ],

            productId: [
                "Catalog ID",
                "Style ID",
                "Product ID"
            ],

            size: [
                "Size"
            ],

            qty: [
                "Qty",
                "Quantity"
            ],

            sellingPrice: [
                "Supplier Listed Price",
                "Price"
            ],

            customerName: [
                "Customer Name",
                "Customer State"
            ],

            phone: [
                "Phone"
            ],

            awb: [
                "AWB",
                "Packet Id"
            ],

            orderStatus: [
                "Reason for Credit Entry",
                "Order Status"
            ]
        },
        inventory: {

            catalogId: [
                "STYLE ID",
            ],

            productName: [
                "Product Name",
            ],

            productId: [
                "Catalog Id",
            ],

            size: [
                "Variation",
                "Size"
            ],

            qty: [
                "Your Stock Count",
                "System Stock Count",
                "Qty",
                "Quantity",
                "Inventory"
            ],

            buyingPrice: [
                "Buying Price"
            ],

            sellingPrice: [
                "Supplier Listed Price",
                "Selling Price"
            ]
        },

        pricing: {

            catalogId: [
                "STYLE ID",
                "Style ID"
            ],

            productName: [
                "PRODUCT NAME"
            ],

            size: [
                "VARIANT",
                "Variation",
                "Size"
            ],

            sellingPrice: [
                "COMPETITIVE MEESHO PRICE",
                "MEESHO PRICE"
            ],

            action: [
                "ACCEPT/REJECT",
                "ACTION"
            ]
        }
    }
};

const MarketplaceCSVImport = ({ user }) => {

    const [rows, setRows] = useState([]);


    const [normalizedPreview, setNormalizedPreview] =
        useState([]);

    const [matchedOrders, setMatchedOrders] =
        useState([]);

    const [unmatchedOrders, setUnmatchedOrders] =
        useState([]);

    const [matching, setMatching] =
        useState(false);

    const [loading, setLoading] = useState(false);

    const [progress, setProgress] = useState(0);

    const [progressText, setProgressText] =
        useState("");

    const [platform, setPlatform] =
        useState("meesho");

    const [cancelImporting, setCancelImporting] = useState(false);

    const location = useLocation();

    const {
        type
    } = location.state || {};

    const [importType, setImportType] =
        useState(type);

    const [fieldMapping, setFieldMapping] =
        useState({
            orderId: "",
            productName: "",
            productId: "",
            catalogId: "",
            size: "",
            qty: "",
            sellingPrice: "",
            customerName: ""
        });
    // ========================================
    // HANDLE CSV
    // ========================================

    const handleCSVUpload = async (e) => {

        try {

            const file = e.target.files[0];

            if (!file) return;

            const fileName =
                file.name.toLowerCase();

            // ========================================
            // CSV FILE
            // ========================================

            if (fileName.endsWith(".csv")) {

                Papa.parse(file, {

                    header: true,

                    skipEmptyLines: true,

                    complete: (results) => {

                        processImportedRows(
                            results.data
                        );
                    }
                });

                return;
            }

            // ========================================
            // EXCEL FILE
            // ========================================

            if (
                fileName.endsWith(".xlsx") ||
                fileName.endsWith(".xls")
            ) {

                const data =
                    await file.arrayBuffer();

                const workbook =
                    XLSX.read(data);

                const firstSheet =
                    workbook.SheetNames[0];

                const worksheet =
                    workbook.Sheets[firstSheet];

                let jsonData = [];

                if (
                    platform === "meesho" &&
                    importType === "pricing"
                ) {

                    // ====================================
                    // RAW SHEET
                    // ====================================

                    const raw =
                        XLSX.utils.sheet_to_json(
                            worksheet,
                            {
                                header: 1,
                                defval: ""
                            }
                        );

                    // ====================================
                    // ROW 2 = HEADERS
                    // index 1 because zero-based
                    // ====================================

                    const headers =
                        raw[1].map(header =>
                            String(header || "").trim()
                        );

                    // ====================================
                    // START FROM ROW 5
                    // index 4 because zero-based
                    // ====================================

                    const dataRows =
                        raw.slice(4);

                    jsonData =
                        dataRows
                            .filter(row =>

                                row.some(cell =>
                                    String(cell || "")
                                        .trim() !== ""
                                )
                            )
                            .map(row => {

                                const obj = {};

                                headers.forEach(
                                    (header, index) => {

                                        obj[header] =
                                            row[index];
                                    }
                                );

                                return obj;
                            });

                } else {

                    jsonData =
                        XLSX.utils.sheet_to_json(
                            worksheet,
                            {
                                defval: ""
                            }
                        );
                }

                processImportedRows(
                    jsonData
                );

                return;
            }

            alert(
                "Unsupported file format"
            );

        } catch (err) {

            console.error(err);

            alert(
                "File reading failed"
            );
        }
    };

    const processImportedRows = (
        importedRows
    ) => {

        if (
            !importedRows ||
            !importedRows.length
        ) {

            alert(
                "No rows found in file"
            );

            return;
        }

        const headers =
            Object.keys(
                importedRows[0] || {}
            );

        const mappedFields =

            applyImportProfile(
                platform,
                importType,
                headers
            );

        setFieldMapping(mappedFields);

        const normalized =
            importedRows.map(row => {

                const normalizedRow = {};

                Object.entries(mappedFields)
                    .forEach(
                        ([internalField, csvColumn]) => {

                            // ====================================
                            // MEESHO PRICING SPECIAL PRICE
                            // ====================================

                            if (
                                platform === "meesho" &&
                                importType === "pricing" &&
                                internalField === "sellingPrice"
                            ) {

                                // priority competitive price
                                normalizedRow.sellingPrice =

                                    row["COMPETITIVE MEESHO PRICE"] ||

                                    row["Competitive Meesho Price"] ||

                                    row["MEESHO PRICE"] ||

                                    row["Meesho Price"] ||

                                    "";

                            } else {

                                normalizedRow[internalField] =

                                    csvColumn &&
                                        row[csvColumn] !== undefined

                                        ? row[csvColumn]

                                        : "";
                            }
                        }
                    );

                return {
                    ...normalizedRow,
                    platform,
                    importType,
                    importedAt:
                        new Date().toISOString()
                };
            });

        setNormalizedPreview(normalized);

        setRows(importedRows);

        setMatchedOrders([]);

        setUnmatchedOrders([]);

        // setNormalizedPreview([]);

        alert(
            `${importedRows.length} rows loaded`
        );
    };

    // ========================================
    // Auto Map fields
    // ========================================


    // ========================================
    // SAVE ORDERS
    // ========================================
    const applyImportProfile = (
        platform,
        importType,
        headers
    ) => {

        const profile =
            importProfiles?.[platform]?.[importType];

        if (!profile) return {};

        const mapped = {};

        Object.entries(profile).forEach(
            ([internalField, aliases]) => {

                const found =
                    headers.find(header =>

                        aliases.some(alias =>

                            header
                                .toLowerCase()
                                .includes(
                                    alias.toLowerCase()
                                )
                        )
                    );

                mapped[internalField] =
                    found || "";
            }
        );

        return mapped;
    };

    // ========================================
    // SAVE ORDERS
    // ========================================


    // ========================================
    // Match Orders With Inventory
    // ========================================
    const matchOrdersWithInventory = async () => {

        if (!rows.length) {

            alert("No CSV rows found");

            return;
        }

        try {

            setMatching(true);

            // ========================================
            // LOAD USER STOCKS
            // ========================================

            const stockQuery = query(
                collection(db, "stocks"),
                where("userId", "==", user.uid)
            );

            const stockSnap =
                await getDocs(stockQuery);

            const stocks =
                stockSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

            const matched = [];

            const unmatched = [];

            // ========================================
            // LOOP CSV ORDERS
            // ========================================

            const sourceRows =
                normalizedPreview;

            for (const row of sourceRows) {

                const catalogValue =
                    row.catalogId;

                const productValue =
                    row.productId;

                const sizeValue =
                    normalizeSize(row.size);

                const qty =
                    Number(row.qty) || 1;

                // ========================================
                // FIND STOCK
                // ========================================

                const stockMatch =
                    stocks.find(stock => {

                        const catalogMatch =
                            catalogValue &&
                            stock.catalogId
                                ?.toLowerCase()
                            ===
                            String(catalogValue)
                                .toLowerCase();

                        const productMatch =
                            productValue &&
                            stock.productId
                                ?.toLowerCase()

                            ===

                            String(productValue)
                                .toLowerCase();

                        return (
                            catalogMatch ||
                            productMatch
                        );
                    });

                // ========================================
                // VALIDATE SIZE
                // ========================================

                if (
                    stockMatch &&
                    stockMatch.sizes?.[sizeValue]
                ) {

                    const sizeStock =
                        stockMatch.sizes[sizeValue];

                    const availableQty =
                        sizeStock.qty || 0;

                    if (availableQty >= qty) {

                        matched.push({
                            row,

                            stock: stockMatch,

                            size: sizeValue,

                            qty,

                            availableQty,

                            status: "matched"
                        });

                    } else {

                        unmatched.push({
                            row,

                            reason:
                                "Insufficient stock"
                        });
                    }

                } else {

                    unmatched.push({
                        row,

                        reason:
                            "Product/Size not found"
                    });
                }
            }

            setMatchedOrders(matched);

            setUnmatchedOrders(unmatched);

            alert(
                `Matched: ${matched.length}, Unmatched: ${unmatched.length}`
            );

        } catch (err) {

            console.error(err);

            alert("Matching failed");

        } finally {

            setMatching(false);

        }
    };


    const validateNormalizedRows = (
        normalizedRows
    ) => {

        const valid = [];

        const invalid = [];

        normalizedRows.forEach(row => {

            const requiredFields =
                internalFields[importType] || [];

            const missing =
                requiredFields.filter(
                    field =>
                        !row[field]
                );

            if (missing.length > 0) {

                invalid.push({
                    row,
                    missing
                });

            } else {

                valid.push(row);

            }
        });

        return {
            valid,
            invalid
        };
    };

    // ========================================
    // EXECUTE IMPORT ENGINE
    // ========================================

    const executeImport = async () => {

        setProgress(0);
        setProgressText("Preparing import...");

        try {

            if (!normalizedPreview.length) {

                alert(
                    "Please normalize data first"
                );

                return;
            }

            setLoading(true);

            if (
                importType === "orders" &&
                !matchedOrders.length
            ) {

                alert(
                    "Please match inventory first"
                );

                return;
            }

            switch (importType) {

                case "orders":

                    await executeOrdersImport();

                    break;

                case "inventory":

                    await executeInventoryImport();

                    break;

                case "pricing":

                    await executePricingImport();

                    break;

                default:

                    alert(
                        "Invalid import type"
                    );
            }

        } catch (err) {

            console.error(err);

            alert(
                "Import execution failed"
            );

        } finally {

            setTimeout(() => {

                setLoading(false);

                setProgress(0);

                setProgressText("");

            }, 1200);
        }
    };

    // ========================================
    // ORDERS IMPORT
    // ========================================

    const executeOrdersImport = async () => {
        const batchRef = {
            current: writeBatch(db)
        };

        const operationRef = {
            current: 0
        };

        const commitBatch = async () => {

            if (operationRef.current === 0)
                return;

            await batchRef.current.commit();

            batchRef.current =
                writeBatch(db);

            operationRef.current = 0;
        };

        if (!matchedOrders.length) {

            alert(
                "Please match inventory first"
            );

            return;
        }
        const total = matchedOrders.length;
        let imported = 0;

        let skipped = 0;

        for (let index = 0; index < matchedOrders.length; index++) {

            const item = matchedOrders[index];

            const percent = Math.round(
                ((index + 1) / total) * 100
            );

            setProgress(percent);

            setProgressText(
                `Importing Orders ${index + 1}/${total}`
            );

            const row = item.row;

            const orderId =
                row.orderId;

            // ====================================
            // DUPLICATE CHECK
            // ====================================

            const saleRef =
                doc(
                    db,
                    "sales",
                    String(orderId)
                );

            const existingSale =
                await getDoc(saleRef);

            if (existingSale.exists()) {

                skipped++;

                continue;
            }

            const stock =
                item.stock;

            const sizeData =
                stock.sizes[item.size];

            const qty =
                Number(item.qty || 1);

            const sellingPrice =
                Number(
                    row.sellingPrice || 0
                );

            const buyingPrice =
                Number(
                    sizeData.buyingPrice || 0
                );

            const profit =
                (
                    sellingPrice -
                    buyingPrice
                ) * qty;

            // ====================================
            // CREATE SALE ENTRY
            // ====================================

            batchRef.current.set(
                saleRef,
                {
                    imported: true,

                    importedAt:
                        serverTimestamp(),

                    saleChannel:
                        "marketplace",

                    saleMode:
                        "csv",

                    status: "sold",
                    soldAt: parseCSVDate(row.orderDate),
                    isSaleOnline: true,
                    orderId,
                    platform,

                    userId:
                        user.uid,

                    stockId:
                        stock.id,

                    uniqueId:
                        stock.uniqueId || "",

                    catalogId:
                        stock.catalogId || "",

                    productId:
                        stock.productId || "",

                    productName:
                        stock.productName || "",

                    size:
                        item.size,

                    qty,

                    sellingPrice,

                    buyingPrice,

                    profit,

                    orderStatus: String(
                        row.orderStatus || "pending"
                    ).toLowerCase(),

                    paymentStatus:
                        "pending",

                    shipmentStatus:
                        "pending",

                    customer: {

                        name:
                            row.customerName || "",

                        phone:
                            row.phone || "",

                        awb:
                            row.awb || ""
                    },

                    marketplaceData:
                        row,

                    deleted: false,

                    isSaleOnline: true,

                    createdBy: user,
                    createdAt:
                        serverTimestamp()
                }
            );

            operationRef.current++;
            if (operationRef.current >= 450) {
                await commitBatch();
            }

            const qrQuery = query(
                collection(db, "qrcodes"),
                where("stockId", "==", stock.id),
                where("size", "==", item.size),
                where("status", "==", "available")
            );

            const qrSnap =
                await getDocs(qrQuery);

            const availableQRs =
                qrSnap.docs.slice(0, qty);

            availableQRs.forEach(qr => {
                qr.ref._pendingSold = true;
            });

            // const availableQRs =
            //     qrSnap.docs
            //         .filter(qr => !qr.ref._pendingSold)
            //         .slice(0, qty);

            for (const qrDoc of availableQRs) {

                batchRef.current.update(
                    doc(db, "qrcodes", qrDoc.id),
                    {
                        status: "sold",
                        soldAt: parseCSVDate(row.orderDate),
                        isSaleOnline: true,
                        saleChannel: "marketplace",
                        orderId,
                        platform
                    }
                );

                operationRef.current++;

                if (operationRef.current >= 450) {
                    await commitBatch();
                }
            }
            // ====================================
            // REDUCE STOCK
            // ====================================

            const stockRef =
                doc(
                    db,
                    "stocks",
                    stock.id
                );

            const updatedSizes = {
                ...stock.sizes
            };

            updatedSizes[item.size].qty =
                Number(
                    updatedSizes[item.size]
                        .qty || 0
                ) - qty;

            batchRef.current.update(
                stockRef,
                {
                    sizes: updatedSizes
                }
            );

            operationRef.current++;
            if (operationRef.current >= 450) {
                await commitBatch();
            }
            imported++;
        }

        setProgress(100);
        setProgressText("Import Completed");
        await commitBatch();

        alert(
            `
Orders Imported: ${imported}
Duplicates Skipped: ${skipped}
        `
        );
    };

    // ========================================
    // INVENTORY IMPORT
    // ========================================

    const executeInventoryImport = async () => {
        const batchRef = {
            current: writeBatch(db)
        };

        const operationRef = {
            current: 0
        };

        const commitBatch = async () => {

            if (operationRef.current === 0)
                return;

            await batchRef.current.commit();

            batchRef.current =
                writeBatch(db);

            operationRef.current = 0;
        };

        let updated = 0;

        const stockQuery = query(
            collection(db, "stocks"),
            where("userId", "==", user.uid)
        );

        const stockSnap =
            await getDocs(stockQuery);

        const stocks =
            stockSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        const groupedInventory = {};

        normalizedPreview.forEach((row) => {

            const catalogKey =
                String(row.catalogId || "")
                    .trim()
                    .toUpperCase();

            const sizeKey =
                String(normalizeSize(row.size) || "")
                    .trim()
                    .toUpperCase();

            if (!catalogKey || !sizeKey) return;

            // ====================================
            // CREATE GROUP
            // ====================================

            if (!groupedInventory[catalogKey]) {

                groupedInventory[catalogKey] = {

                    catalogId: row.catalogId || "",

                    productId: row.productId || "",

                    productName:
                        row.productName || "Marketplace Product",

                    sizes: {}
                };
            }

            // ====================================
            // ADD SIZE
            // ====================================

            if (
                !groupedInventory[catalogKey]
                    .sizes[sizeKey]
            ) {

                groupedInventory[catalogKey]
                    .sizes[sizeKey] = {

                    qty: 0,

                    initialQty: 0,

                    buyingPrice:
                        Number(row.buyingPrice || 0),

                    sellingPrice:
                        Number(row.sellingPrice || 0),

                    margin: 0,

                    extraCosts: {
                        packaging: 0,
                        labeling: 0,
                        rto: 0,
                        returnCost: 0,
                        advertisementCost: 0,
                        delivery: 0,
                        others: 0,
                        gst: 0
                    }
                };
            }

            groupedInventory[catalogKey]
                .sizes[sizeKey].qty +=
                Number(row.qty || 0);

            groupedInventory[catalogKey]
                .sizes[sizeKey].initialQty +=
                Number(row.qty || 0);
        });

        const groupedRows =
            Object.values(groupedInventory);

        const total = groupedRows.length;

        for (
            let index = 0;
            index < groupedRows.length;
            index++
        ) {

            const groupedRow = groupedRows[index];

            const percent = Math.round(
                ((index + 1) / total) * 100
            );

            setProgress(percent);

            setProgressText(
                `Importing Inventory ${index + 1}/${total}`
            );

            const stockMatch =
                stocks.find(stock =>

                    (
                        stock.catalogId
                            ?.toLowerCase()

                        ===

                        String(
                            groupedRow.catalogId
                        ).toLowerCase()
                    ) ||

                    (
                        stock.productId
                            ?.toLowerCase()
                        ===
                        String(
                            groupedRow.productId
                        ).toLowerCase()

                    )
                );

            if (!stockMatch) {

                const sizes = groupedRow.sizes;

                const newStockRef =
                    doc(collection(db, "stocks"));

                const newStock = {

                    userId: user.uid,

                    productName:
                        groupedRow.productName || "Marketplace Product",

                    catalogId:
                        groupedRow.catalogId || "",

                    productId:
                        groupedRow.productId || "",

                    sizes,

                    isItemOnline: true,

                    inventorySource: "csv",

                    platform,
                    createdBy: user,
                    createdAt:
                        serverTimestamp()
                };

                batchRef.current.set(
                    newStockRef,
                    newStock
                );
                operationRef.current++;
                if (operationRef.current >= 450) {
                    await commitBatch();
                }
                for (const sizeKey of Object.keys(groupedRow.sizes)) {

                    const sizeData =
                        groupedRow.sizes[sizeKey];
                    await createQRCodes({
                        batchRef,
                        operationRef,
                        commitBatch,

                        item: {
                            ...newStock,
                            id: newStockRef.id
                        },

                        sizeKey,

                        quantity: Number(sizeData.qty || 0),

                        options: {
                            isOnlineItem: true,
                            inventorySource: "csv",
                            isMarketplaceQR: true,
                            platform
                        }
                    });
                    if (operationRef.current >= 450) {
                        await commitBatch();
                    }
                }

                updated++;

                continue;
            }

            const stockRef =
                doc(
                    db,
                    "stocks",
                    stockMatch.id
                );

            const updatedSizes = {
                ...stockMatch.sizes
            };

            for (const sizeKey of Object.keys(groupedRow.sizes)) {

                const incomingSize =
                    groupedRow.sizes[sizeKey];

                // ====================================
                // CREATE SIZE IF NOT EXISTS
                // ====================================

                if (!updatedSizes[sizeKey]) {

                    updatedSizes[sizeKey] = {
                        ...incomingSize
                    };

                    const updatedItem = {
                        ...stockMatch,
                        sizes: updatedSizes
                    };

                    await createQRCodes({
                        batchRef,
                        operationRef,
                        commitBatch,

                        item: updatedItem,

                        sizeKey,

                        quantity: Number(incomingSize.qty || 0),

                        options: {
                            isOnlineItem: true,
                            inventorySource: "csv",
                            isMarketplaceQR: true,
                            platform
                        }
                    });

                    if (operationRef.current >= 450) {
                        await commitBatch();
                    }

                    continue;
                }

                // ====================================
                // EXISTING SIZE
                // ====================================

                const currentQty =
                    Number(
                        updatedSizes[sizeKey].qty || 0
                    );

                const csvQty =
                    Number(incomingSize.qty || 0);

                const diff =
                    csvQty - currentQty;

                // ====================================
                // ADD STOCK
                // ====================================

                if (diff > 0) {

                    updatedSizes[sizeKey].qty =
                        currentQty + diff;

                    updatedSizes[sizeKey].initialQty =
                        Number(
                            updatedSizes[sizeKey]
                                .initialQty || 0
                        ) + diff;

                    const updatedItem = {
                        ...stockMatch,
                        sizes: updatedSizes
                    };

                    await createQRCodes({
                        batchRef,
                        operationRef,
                        commitBatch,

                        item: updatedItem,

                        sizeKey,

                        quantity: Number(incomingSize.qty || 0),

                        options: {
                            isOnlineItem: true,
                            inventorySource: "csv",
                            isMarketplaceQR: true,
                            platform
                        }
                    });

                    if (operationRef.current >= 450) {
                        await commitBatch();
                    }
                }

                // ====================================
                // REDUCE STOCK
                // ====================================

                if (diff < 0) {

                    updatedSizes[sizeKey].qty =
                        Math.max(
                            0,
                            currentQty - Math.abs(diff)
                        );
                }
            }

            batchRef.current.update(
                stockRef,
                {
                    sizes: updatedSizes,

                    isItemOnline: true,

                    inventorySource: "csv",

                    platform
                }
            );
            stockMatch.sizes = updatedSizes;
            operationRef.current++;
            if (operationRef.current >= 450) {
                await commitBatch();
            }

            updated++;
        }
        setProgress(100);
        setProgressText("Import Completed");
        await commitBatch();

        alert(
            `Inventory Updated: ${updated}`
        );

    };

    // ========================================
    // PRICING IMPORT
    // ========================================

    const executePricingImport = async () => {

        const batchRef = {
            current: writeBatch(db)
        };

        const operationRef = {
            current: 0
        };

        const commitBatch = async () => {

            if (operationRef.current === 0)
                return;

            await batchRef.current.commit();

            batchRef.current = writeBatch(db);

            operationRef.current = 0;
        };

        // ====================================
        // LOAD STOCKS
        // ====================================

        const stockQuery = query(
            collection(db, "stocks"),
            where("userId", "==", user.uid)
        );

        const stockSnap = await getDocs(stockQuery);

        const stocks = stockSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // ====================================
        // REMOVE DUPLICATES
        // ====================================

        const uniqueRows = [];

        const seen = new Set();

        normalizedPreview.forEach(row => {

            const key = [
                row.catalogId,
                normalizeSize(row.size)
            ].join("_");

            if (!seen.has(key)) {

                seen.add(key);

                uniqueRows.push(row);
            }
        });

        const total = uniqueRows.length;

        let updated = 0;

        for (
            let index = 0;
            index < uniqueRows.length;
            index++
        ) {

            const row = uniqueRows[index];

            const percent = Math.round(
                ((index + 1) / total) * 100
            );

            setProgress(percent);

            setProgressText(
                `Updating Pricing ${index + 1}/${total}`
            );

            // ====================================
            // ONLY ACCEPT
            // ====================================

            const action =
                String(row.action || "")
                    .toUpperCase();

            if (
                action.includes("REJECT")
            ) {
                continue;
            }

            // ====================================
            // PRICE
            // ====================================

            const sellingPrice =
                Number(
                    String(row.sellingPrice || "")
                        .replace(/[^0-9.]/g, "")
                );

            if (!sellingPrice) {
                continue;
            }

            console.log({
                catalogId: row.catalogId,
                size: row.size,
                sellingPrice: row.sellingPrice
            });

            // ====================================
            // FIND STOCK
            // MATCH USING STYLE ID
            // ====================================

            const stockMatch =
                stocks.find(stock =>

                    String(stock.catalogId || "")
                        .trim()
                        .toUpperCase()

                    ===

                    String(row.catalogId || "")
                        .trim()
                        .toUpperCase()
                );

            if (!stockMatch) {
                continue;
            }

            const sizeKey =
                normalizeSize(row.size);

            if (
                !stockMatch.sizes?.[sizeKey]
            ) {
                continue;
            }

            const stockRef =
                doc(db, "stocks", stockMatch.id);

            const updatedSizes = {
                ...stockMatch.sizes
            };

            // ====================================
            // UPDATE SELLING PRICE ONLY
            // ====================================

            updatedSizes[sizeKey] = {

                ...updatedSizes[sizeKey],

                sellingPrice
            };

            batchRef.current.update(
                stockRef,
                {
                    sizes: updatedSizes
                }
            );

            stockMatch.sizes = updatedSizes;

            operationRef.current++;

            if (operationRef.current >= 450) {
                await commitBatch();
            }

            updated++;
        }

        setProgress(100);

        setProgressText("Import Completed");

        await commitBatch();

        alert(
            `Pricing Updated: ${updated}`
        );
    };

    const importCancelledOrders = async () => {

        if (!matchedOrders.length) {

            alert("No matched orders found");

            return;
        }

        try {

            setCancelImporting(true);

            const total = matchedOrders.length;

            let updated = 0;

            for (
                let index = 0;
                index < matchedOrders.length;
                index++
            ) {

                const item =
                    matchedOrders[index];

                const row =
                    item.row;

                const orderId =
                    String(row.orderId || "");

                if (!orderId) continue;

                const percent = Math.round(
                    ((index + 1) / total) * 100
                );

                setProgress(percent);

                setProgressText(
                    `Updating Cancelled Orders ${index + 1}/${total}`
                );

                // ========================================
                // FIND SALE
                // ========================================

                const saleRef =
                    doc(db, "sales", orderId);

                const saleSnap =
                    await getDoc(saleRef);

                if (!saleSnap.exists())
                    continue;

                const saleData =
                    saleSnap.data();

                // ========================================
                // ALREADY CANCELLED
                // ========================================

                if (
                    saleData.orderStatus ===
                    "cancelled"
                ) {
                    continue;
                }

                // ========================================
                // UPDATE SALE
                // ========================================

                await updateDoc(saleRef, {
                    orderStatus: "cancelled",
                    cancelledAt:
                        serverTimestamp(),
                    updatedAt:
                        serverTimestamp()
                });

                // ========================================
                // RESTORE STOCK
                // ========================================

                if (
                    saleData.stockId &&
                    saleData.size
                ) {

                    const stockRef = doc(
                        db,
                        "stocks",
                        saleData.stockId
                    );

                    const stockSnap =
                        await getDoc(stockRef);

                    if (stockSnap.exists()) {

                        const stockData =
                            stockSnap.data();

                        const updatedSizes = {
                            ...stockData.sizes
                        };

                        if (
                            !updatedSizes[
                            saleData.size
                            ]
                        ) {

                            updatedSizes[
                                saleData.size
                            ] = {
                                qty: 0
                            };
                        }

                        updatedSizes[
                            saleData.size
                        ].qty =
                            Number(
                                updatedSizes[
                                    saleData.size
                                ].qty || 0
                            ) +
                            Number(
                                saleData.qty || 1
                            );

                        await updateDoc(
                            stockRef,
                            {
                                sizes:
                                    updatedSizes
                            }
                        );
                    }
                }

                // ========================================
                // RESTORE QR
                // ========================================

                const qrQuery = query(
                    collection(db, "qrcodes"),
                    where(
                        "orderId",
                        "==",
                        orderId
                    )
                );

                const qrSnap =
                    await getDocs(qrQuery);

                for (const qrDoc of qrSnap.docs) {

                    await updateDoc(
                        doc(
                            db,
                            "qrcodes",
                            qrDoc.id
                        ),
                        {
                            status:
                                "available",

                            orderId: "",

                            soldAt: null,

                            updatedAt:
                                serverTimestamp()
                        }
                    );
                }

                updated++;
            }

            setProgress(100);

            setProgressText(
                "Cancelled Orders Updated"
            );

            alert(
                `Cancelled Orders Updated: ${updated}`
            );

        } catch (err) {

            console.error(err);

            alert(
                "Cancelled import failed"
            );

        } finally {

            setTimeout(() => {

                setCancelImporting(false);

                setProgress(0);

                setProgressText("");

            }, 1200);
        }
    };

    return (
        <div
            style={{
                padding: "20px"
            }}
        >

            <h2>
                Marketplace CSV Import
            </h2>

            <p>
                Upload marketplace order CSV
                files and sync them into your
                inventory system.
            </p>

            {/* PLATFORM */}

            <div
                style={{
                    marginBottom: "20px"
                }}
            >

                <select
                    value={platform}

                    onChange={(e) =>
                        setPlatform(
                            e.target.value
                        )
                    }

                    style={{
                        padding: "10px",
                        borderRadius: "8px"
                    }}
                >

                    <option value="meesho">
                        Meesho
                    </option>

                    <option value="flipkart">
                        Flipkart
                    </option>

                    <option value="amazon">
                        Amazon
                    </option>

                </select>

            </div>

            <select
                value={importType}

                onChange={(e) =>
                    setImportType(
                        e.target.value
                    )
                }

                style={{
                    padding: "10px",
                    borderRadius: "8px",
                    marginLeft: "10px"
                }}
                disabled={location}
            >

                <option value="orders">
                    Orders Import
                </option>

                <option value="inventory">
                    Inventory Import
                </option>

                <option value="pricing">
                    Pricing Import
                </option>

            </select>

            {/* FILE */}

            <div
                style={{
                    marginBottom: "20px"
                }}
            >

                <input
                    type="file"

                    accept=".csv,.xlsx,.xls"

                    onChange={handleCSVUpload}
                />

            </div>

            {/* MATCH BUTTON */}

            <button
                onClick={matchOrdersWithInventory}

                disabled={
                    matching ||
                    !rows.length
                }

                style={{
                    padding: "12px 20px",
                    border: "none",
                    borderRadius: "10px",
                    background: "#16a34a",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                    marginLeft: "10px"
                }}
                className="summary-card"
            >
                {matching
                    ? "Matching..."
                    : "🔍 Match Inventory"}
            </button>

            {/* IMPORT BUTTON */}
            <button
                onClick={executeImport}

                disabled={loading || !rows.length}

                style={{
                    padding: "12px 20px",

                    border: "none",

                    borderRadius: "10px",

                    background: "#2563eb",

                    color: "#fff",

                    cursor: "pointer",

                    fontWeight: "bold"
                }}
                className="summary-card"
            >
                {loading
                    ? "Importing..."
                    : `Execute ${importType} Import`}
            </button>

            {/* CANCELLED BUTTON */}
            {loading && (
                <button
                    onClick={importCancelledOrders}
                    disabled={cancelImporting || !matchedOrders.length}
                    style={{
                        padding: "12px 20px",
                        border: "none",
                        borderRadius: "10px",
                        background: "#dc2626",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "bold",
                        marginLeft: "10px"
                    }}
                    className="summary-card"
                >
                    {cancelImporting
                        ? "Cancelling..."
                        : "❌ Import Cancelled Orders"}
                </button>
            )}

            {loading && (

                <div
                    style={{
                        marginTop: "20px",
                        width: "100%"
                    }}
                >

                    <div
                        style={{
                            marginBottom: "8px",
                            fontWeight: "bold",
                            fontSize: "14px"
                        }}
                    >
                        {progressText}
                    </div>

                    <div
                        style={{
                            width: "100%",
                            height: "24px",
                            background: "#222",
                            borderRadius: "12px",
                            overflow: "hidden",
                            border: "1px solid #444"
                        }}
                    >

                        <div
                            style={{
                                width: `${progress}%`,
                                height: "100%",
                                background:
                                    "linear-gradient(90deg,#2563eb,#16a34a)",
                                transition: "width 0.3s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: "bold",
                                fontSize: "13px"
                            }}
                        >
                            {progress}%
                        </div>

                    </div>

                </div>
            )}

            {/* PREVIEW */}

            {rows.length > 0 && (

                <div
                    style={{
                        marginTop: "30px"
                    }}
                >

                    <h3>
                        CSV Preview
                    </h3>

                    <div
                        style={{
                            marginBottom: "20px",
                            padding: "15px",
                            border: "1px solid #333",
                            borderRadius: "10px"
                        }}
                    >

                        <h3>
                            CSV Field Mapping
                        </h3>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit,minmax(220px,1fr))",
                                gap: "15px"
                            }}
                        >

                            {Object.entries(fieldMapping).map(
                                ([systemField, selectedColumn]) => (

                                    <div key={systemField}>

                                        <label
                                            style={{
                                                display: "block",
                                                marginBottom: "5px",
                                                fontSize: "12px"
                                            }}
                                        >
                                            {systemField}
                                        </label>

                                        <select
                                            value={selectedColumn}

                                            onChange={(e) => {

                                                const updatedMapping = {

                                                    ...fieldMapping,

                                                    [systemField]:
                                                        e.target.value
                                                };

                                                setFieldMapping(updatedMapping);

                                                // ====================================
                                                // LIVE RE-NORMALIZE
                                                // ====================================

                                                const normalized =
                                                    rows.map(row => {

                                                        const normalizedRow = {};

                                                        Object.entries(updatedMapping)
                                                            .forEach(
                                                                ([internalField, csvColumn]) => {

                                                                    normalizedRow[internalField] =

                                                                        csvColumn &&
                                                                            row[csvColumn] !== undefined

                                                                            ? row[csvColumn]

                                                                            : "";
                                                                }
                                                            );

                                                        return {
                                                            ...normalizedRow,

                                                            platform,

                                                            importType,

                                                            importedAt:
                                                                new Date().toISOString()
                                                        };
                                                    });

                                                setNormalizedPreview(normalized);

                                                // RESET MATCH STATES
                                                setMatchedOrders([]);

                                                setUnmatchedOrders([]);
                                            }}

                                            style={{
                                                width: "100%",
                                                padding: "10px",
                                                borderRadius: "8px"
                                            }}
                                        >

                                            <option value="">
                                                Select Column
                                            </option>

                                            {Object.keys(
                                                rows[0] || {}
                                            ).map((column) => (

                                                <option
                                                    key={column}
                                                    value={column}
                                                >
                                                    {column}
                                                </option>

                                            ))}

                                        </select>

                                    </div>
                                )
                            )}

                        </div>

                    </div>

                    <div
                        className="table-wrapper"
                    >

                        <table
                            className="sales-table"
                        >

                            <thead>

                                <tr>

                                    {Object.keys(
                                        rows[0]
                                    ).map((key) => (

                                        <th key={key}>
                                            {key}
                                        </th>

                                    ))}

                                </tr>

                            </thead>

                            <tbody>

                                {rows
                                    .slice(0, 20)
                                    .map(
                                        (
                                            row,
                                            idx
                                        ) => (

                                            <tr
                                                key={idx}
                                            >

                                                {Object.values(
                                                    row
                                                ).map(
                                                    (
                                                        value,
                                                        i
                                                    ) => (

                                                        <td
                                                            key={
                                                                i
                                                            }
                                                        >
                                                            {value}
                                                        </td>

                                                    )
                                                )}

                                            </tr>

                                        )
                                    )}

                            </tbody>

                        </table>

                    </div>

                </div>
            )}

            {normalizedPreview.length > 0 && (

                <div
                    style={{
                        marginTop: "40px"
                    }}
                >

                    <h3>
                        🔄 Normalized Data Preview
                    </h3>

                    <div
                        className="table-wrapper"
                    >

                        <table
                            className="sales-table"
                        >

                            <thead>

                                <tr>

                                    {Object.keys(
                                        normalizedPreview[0]
                                    ).map(key => (

                                        <th key={key}>
                                            {key}
                                        </th>

                                    ))}

                                </tr>

                            </thead>

                            <tbody>

                                {normalizedPreview
                                    .slice(0, 20)
                                    .map(
                                        (
                                            row,
                                            idx
                                        ) => (

                                            <tr key={idx}>

                                                {Object.values(row)
                                                    .map(
                                                        (
                                                            value,
                                                            i
                                                        ) => (

                                                            <td key={i}>
                                                                {String(value)}
                                                            </td>

                                                        )
                                                    )}

                                            </tr>

                                        )
                                    )}

                            </tbody>

                        </table>

                    </div>

                </div>
            )}

            {/* ========================================
    MATCHED ORDERS
======================================== */}

            {matchedOrders.length > 0 && (

                <div
                    style={{
                        marginTop: "40px"
                    }}
                >

                    <h3>
                        ✅ Matched Orders
                    </h3>

                    <div
                        className="table-wrapper"

                    >

                        <table
                            className="sales-table"

                        >

                            <thead>

                                <tr>

                                    <th>
                                        Product
                                    </th>

                                    <th>
                                        Catalog
                                    </th>

                                    <th>
                                        Size
                                    </th>

                                    <th>
                                        Order Qty
                                    </th>

                                    <th>
                                        Available
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {matchedOrders.map(
                                    (
                                        item,
                                        idx
                                    ) => (

                                        <tr key={idx}>

                                            <td>
                                                {item.stock.productName}
                                            </td>

                                            <td>
                                                {item.stock.catalogId}
                                            </td>

                                            <td>
                                                {item.size}
                                            </td>

                                            <td>
                                                {item.qty}
                                            </td>

                                            <td>
                                                {item.availableQty}
                                            </td>

                                            <td>
                                                ✅ Matched
                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                    {/* ========================================
    UNMATCHED ORDERS
======================================== */}

                    {unmatchedOrders.length > 0 && (

                        <div
                            style={{
                                marginTop: "40px"
                            }}
                        >

                            <h3>
                                ❌ Unmatched Orders
                            </h3>

                            <div
                                className="table-wrapper"
                            >

                                <table
                                    className="sales-table"
                                >

                                    <thead>

                                        <tr>

                                            <th>
                                                Reason
                                            </th>

                                            <th>
                                                Data
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {unmatchedOrders.map(
                                            (
                                                item,
                                                idx
                                            ) => (

                                                <tr key={idx}>

                                                    <td>
                                                        {item.reason}
                                                    </td>

                                                    <td>
                                                        <pre
                                                            style={{
                                                                whiteSpace:
                                                                    "pre-wrap"
                                                            }}
                                                        >
                                                            {JSON.stringify(
                                                                item.row,
                                                                null,
                                                                2
                                                            )}
                                                        </pre>
                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>
                    )}

                </div>
            )}

        </div>
    );
};

export default MarketplaceCSVImport;