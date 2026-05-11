// src/utils/categoryMap.js

// ========================================
// CATEGORY MAP
// ========================================

export const categoryMap = {

    Men: [
        "T-Shirt",
        "Shirt",
        "Polo T-Shirt",
        "Full Sleeve T-Shirt",
        "Sleeveless T-Shirt",
        "Tank Top",
        "Casual Shirt",
        "Formal Shirt",
        "Denim Shirt",
        "Linen Shirt",
        "Kurta",
        "Panjabi",
        "Blazer",
        "Suit",
        "Jacket",
        "Hoodie",
        "Sweatshirt",
        "Sweater",
        "Waistcoat",
        "Pant",
        "Jeans",
        "Cargo Pant",
        "Chinos",
        "Joggers",
        "Track Pant",
        "Shorts",
        "Three Quarter",
        "Lungi",
        "Dhoti",
        "Innerwear",
        "Vest",
        "Boxer",
        "Nightwear",
        "Raincoat"
    ],

    Women: [
        "Top",
        "Crop Top",
        "T-Shirt",
        "Shirt",
        "Kurti",
        "Kurta",
        "Saree",
        "Blouse",
        "Salwar Suit",
        "Lehenga",
        "Gown",
        "Dress",
        "Maxi Dress",
        "Midi Dress",
        "Mini Dress",
        "Skirt",
        "Palazzo",
        "Leggings",
        "Jeans",
        "Pant",
        "Jeggings",
        "Shorts",
        "Jacket",
        "Shrug",
        "Hoodie",
        "Sweater",
        "Nightwear",
        "Innerwear",
        "Bra",
        "Panty",
        "Dupatta",
        "Hijab",
        "Raincoat"
    ],

    Children: [
        "T-Shirt",
        "Shirt",
        "Panjabi",
        "Kurta",
        "Dress Set",
        "Frock",
        "Top",
        "Jeans",
        "Pant",
        "Shorts",
        "Track Pant",
        "Hoodie",
        "Sweater",
        "Jacket",
        "School Uniform",
        "Ethnic Wear",
        "Night Suit",
        "Dungaree",
        "Onesie",
        "Baby Set",
        "Diaper",
        "Cap",
        "Winter Wear",
        "Raincoat"
    ]
};


// ========================================
// SIZE MASTER MAP
// ========================================

export const sizeCategoryMap = {

    clothing: [
        "Free Size",
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
        "8XL"
    ],

    waist: [
        "20",
        "22",
        "24",
        "26",
        "28",
        "30",
        "32",
        "34",
        "36",
        "38",
        "40",
        "42",
        "44",
        "46",
        "48",
        "50"
    ],

    kidsAge: [
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
    ],

    footwear: [
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12"
    ],

    bra: [
        "28",
        "30",
        "32",
        "34",
        "36",
        "38",
        "40",
        "42",
        "44"
    ],

    fabric: [
        "1 Meter",
        "1.5 Meter",
        "2 Meter",
        "2.5 Meter",
        "3 Meter",
        "4 Meter",
        "5 Meter",
        "5.5 Meter",
        "6 Meter",
        "7 Meter",
        "8 Meter",
        "9 Meter"
    ]
};


// ========================================
// PRODUCT => SIZE TYPE AUTO MAP
// ========================================

export const productSizeTypeMap = {

    Men: {

        "T-Shirt": "clothing",
        "Shirt": "clothing",
        "Polo T-Shirt": "clothing",
        "Full Sleeve T-Shirt": "clothing",
        "Sleeveless T-Shirt": "clothing",
        "Tank Top": "clothing",
        "Casual Shirt": "clothing",
        "Formal Shirt": "clothing",
        "Denim Shirt": "clothing",
        "Linen Shirt": "clothing",
        "Kurta": "clothing",
        "Panjabi": "clothing",
        "Blazer": "clothing",
        "Suit": "clothing",
        "Jacket": "clothing",
        "Hoodie": "clothing",
        "Sweatshirt": "clothing",
        "Sweater": "clothing",
        "Waistcoat": "clothing",
        "Vest": "clothing",
        "Innerwear": "clothing",
        "Boxer": "clothing",
        "Nightwear": "clothing",
        "Raincoat": "clothing",

        "Pant": "waist",
        "Jeans": "waist",
        "Cargo Pant": "waist",
        "Chinos": "waist",
        "Joggers": "waist",
        "Track Pant": "waist",
        "Shorts": "waist",
        "Three Quarter": "waist",

        "Lungi": "fabric",
        "Dhoti": "fabric"
    },

    Women: {

        "Top": "clothing",
        "Crop Top": "clothing",
        "T-Shirt": "clothing",
        "Shirt": "clothing",
        "Kurti": "clothing",
        "Kurta": "clothing",
        "Blouse": "clothing",
        "Salwar Suit": "clothing",
        "Lehenga": "clothing",
        "Gown": "clothing",
        "Dress": "clothing",
        "Maxi Dress": "clothing",
        "Midi Dress": "clothing",
        "Mini Dress": "clothing",
        "Jacket": "clothing",
        "Shrug": "clothing",
        "Hoodie": "clothing",
        "Sweater": "clothing",
        "Nightwear": "clothing",
        "Innerwear": "clothing",
        "Panty": "clothing",
        "Raincoat": "clothing",

        "Palazzo": "waist",
        "Leggings": "waist",
        "Jeans": "waist",
        "Pant": "waist",
        "Jeggings": "waist",
        "Shorts": "waist",
        "Skirt": "waist",

        "Bra": "bra",

        "Saree": "fabric",
        "Dupatta": "fabric",
        "Hijab": "fabric"
    },

    Children: {

        "T-Shirt": "kidsAge",
        "Shirt": "kidsAge",
        "Panjabi": "kidsAge",
        "Kurta": "kidsAge",
        "Dress Set": "kidsAge",
        "Frock": "kidsAge",
        "Top": "kidsAge",
        "Jeans": "kidsAge",
        "Pant": "kidsAge",
        "Shorts": "kidsAge",
        "Track Pant": "kidsAge",
        "Hoodie": "kidsAge",
        "Sweater": "kidsAge",
        "Jacket": "kidsAge",
        "School Uniform": "kidsAge",
        "Ethnic Wear": "kidsAge",
        "Night Suit": "kidsAge",
        "Dungaree": "kidsAge",
        "Onesie": "kidsAge",
        "Baby Set": "kidsAge",
        "Diaper": "kidsAge",
        "Cap": "kidsAge",
        "Winter Wear": "kidsAge",
        "Raincoat": "kidsAge"
    },

    default: "clothing"
};


// ========================================
// COLOR OPTIONS
// ========================================

export const colorOptions = [

    "Black",
    "White",
    "Red",
    "Blue",
    "Green",
    "Yellow",
    "Grey",
    "Gray",
    "Navy",
    "Maroon",
    "Brown",
    "Pink",
    "Purple",
    "Orange",
    "Violet",
    "Indigo",
    "Cyan",
    "Magenta",
    "Lime",
    "Teal",
    "Olive",
    "Silver",
    "Gold",
    "Beige",
    "Cream",

    "Dark Black",
    "Charcoal",
    "Dark Grey",
    "Dark Blue",
    "Dark Green",
    "Dark Brown",
    "Dark Purple",
    "Dark Red",

    "Light Blue",
    "Sky Blue",
    "Baby Blue",
    "Light Green",
    "Mint Green",
    "Light Pink",
    "Peach",
    "Lavender",
    "Light Grey",
    "Off White",

    "Wine",
    "Burgundy",
    "Mustard",
    "Turquoise",
    "Aqua",
    "Coral",
    "Khaki",
    "Camel",
    "Chocolate",
    "Coffee",
    "Tan",
    "Rust",
    "Ivory",
    "Pearl",
    "Plum",
    "Rose Gold",

    "Denim Blue",
    "Stone Wash",
    "Ash",
    "Smoke Grey",

    "Metallic Silver",
    "Metallic Gold",
    "Copper",
    "Bronze",

    "Multicolor",
    "Printed",
    "Striped",
    "Checked",
    "Floral",
    "Camouflage",

    "Transparent",
    "Clear"
];


// ========================================
// MASTER PRODUCT TYPES
// ========================================

export const productTypes = [

    "Formal",
    "Casual",
    "Party Wear",
    "Sports",

    "Daily Wear",
    "Office Wear",
    "College Wear",
    "Home Wear",
    "Travel Wear",
    "Street Wear",
    "Lounge Wear",

    "Fashion Wear",
    "Designer Wear",
    "Premium",
    "Luxury",
    "Vintage",
    "Trendy",
    "Classic",

    "Ethnic Wear",
    "Traditional",
    "Festive Wear",
    "Wedding Wear",
    "Ceremonial",

    "Gym Wear",
    "Active Wear",
    "Athleisure",
    "Yoga Wear",
    "Running Wear",

    "Winter Wear",
    "Summer Wear",
    "Rain Wear",

    "Night Wear",
    "Beach Wear",
    "Maternity Wear",
    "Kids Wear",
    "Baby Wear",
    "School Wear",
    "Couple Wear",

    "Denim",
    "Cotton",
    "Linen",
    "Woolen",

    "Business",
    "Smart Casual",
    "Semi Formal",
    "Outdoor",
    "Indoor"
];


// ========================================
// PRODUCT TYPE MAP
// FULLY ENHANCED
// ========================================

export const productTypeMap = {

    Men: {

        "T-Shirt": [
            "Casual",
            "Daily Wear",
            "Street Wear",
            "Sports",
            "Gym Wear",
            "Summer Wear"
        ],

        "Shirt": [
            "Formal",
            "Casual",
            "Office Wear",
            "Business",
            "Party Wear"
        ],

        "Polo T-Shirt": [
            "Casual",
            "Sports",
            "College Wear",
            "Smart Casual"
        ],

        "Full Sleeve T-Shirt": [
            "Casual",
            "Winter Wear",
            "Daily Wear"
        ],

        "Sleeveless T-Shirt": [
            "Gym Wear",
            "Sports",
            "Summer Wear",
            "Active Wear"
        ],

        "Tank Top": [
            "Gym Wear",
            "Sports",
            "Summer Wear",
            "Beach Wear"
        ],

        "Casual Shirt": [
            "Casual",
            "Daily Wear",
            "Travel Wear",
            "Smart Casual"
        ],

        "Formal Shirt": [
            "Formal",
            "Office Wear",
            "Business",
            "Semi Formal"
        ],

        "Denim Shirt": [
            "Casual",
            "Street Wear",
            "Denim"
        ],

        "Linen Shirt": [
            "Casual",
            "Summer Wear",
            "Premium",
            "Linen"
        ],

        "Kurta": [
            "Traditional",
            "Ethnic Wear",
            "Festive Wear",
            "Wedding Wear"
        ],

        "Panjabi": [
            "Traditional",
            "Ethnic Wear",
            "Festive Wear",
            "Ceremonial"
        ],

        "Blazer": [
            "Formal",
            "Business",
            "Office Wear",
            "Party Wear"
        ],

        "Suit": [
            "Formal",
            "Wedding Wear",
            "Business",
            "Ceremonial"
        ],

        "Jacket": [
            "Winter Wear",
            "Outdoor",
            "Casual",
            "Travel Wear"
        ],

        "Hoodie": [
            "Winter Wear",
            "Casual",
            "Street Wear",
            "Sports"
        ],

        "Sweatshirt": [
            "Winter Wear",
            "Casual",
            "Home Wear"
        ],

        "Sweater": [
            "Winter Wear",
            "Woolen",
            "Casual"
        ],

        "Waistcoat": [
            "Formal",
            "Traditional",
            "Wedding Wear"
        ],

        "Pant": [
            "Formal",
            "Office Wear",
            "Daily Wear"
        ],

        "Jeans": [
            "Casual",
            "Street Wear",
            "Travel Wear",
            "Denim"
        ],

        "Cargo Pant": [
            "Outdoor",
            "Travel Wear",
            "Casual"
        ],

        "Chinos": [
            "Smart Casual",
            "Office Wear",
            "Business"
        ],

        "Joggers": [
            "Sports",
            "Gym Wear",
            "Active Wear",
            "Home Wear"
        ],

        "Track Pant": [
            "Sports",
            "Gym Wear",
            "Running Wear"
        ],

        "Shorts": [
            "Casual",
            "Beach Wear",
            "Summer Wear",
            "Sports"
        ],

        "Three Quarter": [
            "Casual",
            "Home Wear",
            "Sports"
        ],

        "Lungi": [
            "Traditional",
            "Home Wear",
            "Daily Wear"
        ],

        "Dhoti": [
            "Traditional",
            "Ceremonial",
            "Wedding Wear"
        ],

        "Innerwear": [
            "Daily Wear",
            "Home Wear"
        ],

        "Vest": [
            "Innerwear",
            "Gym Wear",
            "Summer Wear"
        ],

        "Boxer": [
            "Night Wear",
            "Home Wear",
            "Lounge Wear"
        ],

        "Nightwear": [
            "Night Wear",
            "Home Wear"
        ],

        "Raincoat": [
            "Rain Wear",
            "Outdoor"
        ]
    },


    Women: {

        "Top": [
            "Casual",
            "College Wear",
            "Daily Wear"
        ],

        "Crop Top": [
            "Casual",
            "Party Wear",
            "Street Wear",
            "Summer Wear"
        ],

        "T-Shirt": [
            "Casual",
            "Sports",
            "Daily Wear"
        ],

        "Shirt": [
            "Formal",
            "Office Wear",
            "Smart Casual"
        ],

        "Kurti": [
            "Ethnic Wear",
            "Traditional",
            "Office Wear",
            "Daily Wear"
        ],

        "Kurta": [
            "Traditional",
            "Ethnic Wear",
            "Festive Wear"
        ],

        "Saree": [
            "Traditional",
            "Wedding Wear",
            "Festive Wear",
            "Designer Wear",
            "Party Wear"
        ],

        "Blouse": [
            "Traditional",
            "Designer Wear",
            "Party Wear"
        ],

        "Salwar Suit": [
            "Traditional",
            "Ethnic Wear",
            "Office Wear",
            "Festive Wear"
        ],

        "Lehenga": [
            "Wedding Wear",
            "Festive Wear",
            "Designer Wear",
            "Luxury"
        ],

        "Gown": [
            "Party Wear",
            "Wedding Wear",
            "Luxury"
        ],

        "Dress": [
            "Party Wear",
            "Casual",
            "Daily Wear"
        ],

        "Maxi Dress": [
            "Party Wear",
            "Beach Wear",
            "Summer Wear"
        ],

        "Midi Dress": [
            "Casual",
            "Party Wear",
            "College Wear"
        ],

        "Mini Dress": [
            "Party Wear",
            "Street Wear",
            "Trendy"
        ],

        "Skirt": [
            "Casual",
            "College Wear",
            "Party Wear"
        ],

        "Palazzo": [
            "Casual",
            "Ethnic Wear",
            "Daily Wear"
        ],

        "Leggings": [
            "Daily Wear",
            "Home Wear",
            "Active Wear"
        ],

        "Jeans": [
            "Casual",
            "Street Wear",
            "Travel Wear",
            "Denim"
        ],

        "Pant": [
            "Formal",
            "Office Wear",
            "Business"
        ],

        "Jeggings": [
            "Casual",
            "Daily Wear",
            "Stretch Wear"
        ],

        "Shorts": [
            "Casual",
            "Beach Wear",
            "Summer Wear"
        ],

        "Jacket": [
            "Winter Wear",
            "Outdoor",
            "Casual"
        ],

        "Shrug": [
            "Fashion Wear",
            "Casual",
            "Party Wear"
        ],

        "Hoodie": [
            "Winter Wear",
            "Casual",
            "Street Wear"
        ],

        "Sweater": [
            "Winter Wear",
            "Woolen",
            "Casual"
        ],

        "Nightwear": [
            "Night Wear",
            "Home Wear"
        ],

        "Innerwear": [
            "Daily Wear",
            "Home Wear"
        ],

        "Bra": [
            "Daily Wear",
            "Innerwear"
        ],

        "Panty": [
            "Daily Wear",
            "Innerwear"
        ],

        "Dupatta": [
            "Traditional",
            "Ethnic Wear",
            "Festive Wear"
        ],

        "Hijab": [
            "Traditional",
            "Daily Wear",
            "Religious Wear"
        ],

        "Raincoat": [
            "Rain Wear",
            "Outdoor"
        ]
    },


    Children: {

        "T-Shirt": [
            "Kids Wear",
            "Daily Wear",
            "Sports"
        ],

        "Shirt": [
            "Kids Wear",
            "Formal",
            "Party Wear"
        ],

        "Panjabi": [
            "Kids Wear",
            "Traditional",
            "Festive Wear"
        ],

        "Kurta": [
            "Kids Wear",
            "Traditional",
            "Festive Wear"
        ],

        "Dress Set": [
            "Kids Wear",
            "Party Wear",
            "Daily Wear"
        ],

        "Frock": [
            "Kids Wear",
            "Party Wear",
            "Daily Wear"
        ],

        "Top": [
            "Kids Wear",
            "Daily Wear"
        ],

        "Jeans": [
            "Kids Wear",
            "Casual",
            "Denim"
        ],

        "Pant": [
            "Kids Wear",
            "Daily Wear"
        ],

        "Shorts": [
            "Kids Wear",
            "Summer Wear",
            "Sports"
        ],

        "Track Pant": [
            "Kids Wear",
            "Sports",
            "Active Wear"
        ],

        "Hoodie": [
            "Kids Wear",
            "Winter Wear",
            "Casual"
        ],

        "Sweater": [
            "Kids Wear",
            "Winter Wear",
            "Woolen"
        ],

        "Jacket": [
            "Kids Wear",
            "Winter Wear",
            "Outdoor"
        ],

        "School Uniform": [
            "School Wear",
            "Formal"
        ],

        "Ethnic Wear": [
            "Traditional",
            "Festive Wear",
            "Kids Wear"
        ],

        "Night Suit": [
            "Night Wear",
            "Kids Wear",
            "Home Wear"
        ],

        "Dungaree": [
            "Kids Wear",
            "Casual",
            "Daily Wear"
        ],

        "Onesie": [
            "Baby Wear",
            "Night Wear"
        ],

        "Baby Set": [
            "Baby Wear",
            "Daily Wear"
        ],

        "Diaper": [
            "Baby Wear",
            "Daily Use"
        ],

        "Cap": [
            "Kids Wear",
            "Outdoor",
            "Summer Wear"
        ],

        "Winter Wear": [
            "Winter Wear",
            "Kids Wear"
        ],

        "Raincoat": [
            "Rain Wear",
            "Outdoor",
            "Kids Wear"
        ]
    }
};


// ========================================
// SAFE GETTERS
// ========================================

export const getProductTypes = (
    category,
    productName
) => {

    return (
        productTypeMap?.[category]?.[productName] ||
        ["Casual"]
    );
};


export const getSizeType = (
    category,
    productName
) => {

    return (
        productSizeTypeMap?.[category]?.[productName] ||
        productSizeTypeMap.default
    );
};


export const getSizesByProduct = (
    category,
    productName
) => {

    const sizeType = getSizeType(
        category,
        productName
    );

    return (
        sizeCategoryMap?.[sizeType] ||
        sizeCategoryMap.clothing
    );
};