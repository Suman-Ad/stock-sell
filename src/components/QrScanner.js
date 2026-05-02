import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const QRScanner = ({ onScan }) => {
    const scannerRef = useRef(null);
    const isRunningRef = useRef(false);

    useEffect(() => {
        document.getElementById("reader").innerHTML = "";
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            (decodedText) => {
                onScan(decodedText);
            },
            () => { }
        ).then(() => {
            isRunningRef.current = true;
        }).catch((err) => {
            console.error("Scanner start failed:", err);
        });

        return () => {
            // ✅ SAFE STOP
            if (scannerRef.current && isRunningRef.current) {
                scannerRef.current
                    .stop()
                    .then(() => {
                        isRunningRef.current = false;
                    })
                    .catch((err) => {
                        console.warn("Stop skipped:", err);
                    });
            }
        };
    }, [onScan]);

    return <div id="reader" style={{ width: "300px" }} />;
};

export default QRScanner;