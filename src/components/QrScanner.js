import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const QRScanner = ({ onScan }) => {

    const scannerRef = useRef(null);

    const scannedRef = useRef(false);

    const runningRef = useRef(false);

    useEffect(() => {

        const html5QrCode = new Html5Qrcode("reader");

        scannerRef.current = html5QrCode;

        const startScanner = async () => {

            try {

                await html5QrCode.start(

                    {
                        facingMode: "environment"
                    },

                    {
                        fps: 20,

                        qrbox: {
                            width: 250,
                            height: 250
                        },

                        aspectRatio: 1,

                        disableFlip: false,

                        experimentalFeatures: {
                            useBarCodeDetectorIfSupported: true
                        },

                        rememberLastUsedCamera: true,

                        videoConstraints: {
                            facingMode: "environment",
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        }
                    },

                    async (decodedText) => {

                        if (scannedRef.current) return;

                        scannedRef.current = true;

                        try {

                            if (runningRef.current) {

                                runningRef.current = false;

                                await html5QrCode.stop();

                                await html5QrCode.clear();
                            }

                        } catch (err) {
                            console.log(err);
                        }

                        onScan(decodedText);
                    },

                    () => { }
                );

                runningRef.current = true;

            } catch (err) {

                console.error("Scanner failed:", err);

            }
        };

        startScanner();

        return async () => {

            scannedRef.current = true;

            try {

                if (
                    scannerRef.current &&
                    runningRef.current
                ) {

                    runningRef.current = false;

                    await scannerRef.current.stop();

                    await scannerRef.current.clear();
                }

            } catch (err) {
                console.log(err);
            }
        };

    }, []);

    return (

        <div
            id="reader"
            style={{
                width: "100%",
                maxWidth: "420px",
                margin: "auto",
                borderRadius: "12px",
                overflow: "hidden",
                border: "6px solid #fff",
                background: "#000"
            }}
        />

    );
};

export default QRScanner;

// import React, { useEffect, useRef } from "react";
// import { Html5Qrcode } from "html5-qrcode";

// const QRScanner = ({ onScan }) => {
//     const scannerRef = useRef(null);
//     const isRunningRef = useRef(false);

//     useEffect(() => {
//         const scanner = new Html5Qrcode("reader");
//         scannerRef.current = scanner;

//         const startScanner = async () => {
//             try {
//                 await scanner.start(
//                     { facingMode: "environment" },
//                     { fps: 10, qrbox: 250 },
//                     (decodedText) => {
//                         // 🔥 stop immediately after scan
//                         if (isRunningRef.current) {
//                             isRunningRef.current = false;

//                             scanner.stop()
//                                 .then(() => scanner.clear())
//                                 .catch(() => { });

//                             onScan(decodedText);
//                         }
//                     },
//                     () => { }
//                 );

//                 isRunningRef.current = true;

//             } catch (err) {
//                 console.error("Scanner start failed:", err);
//             }
//         };

//         startScanner();

//         return () => {
//             if (scannerRef.current && isRunningRef.current) {
//                 scannerRef.current
//                     .stop()
//                     .then(() => {
//                         isRunningRef.current = false;
//                         return scannerRef.current.clear();
//                     })
//                     .catch(() => { });
//             }
//         };
//     }, []); // ✅ IMPORTANT: no dependency

//     return <div id="reader" style={{ width: "300px", border: "4px solid #fff" }} />;
// };

// export default QRScanner;