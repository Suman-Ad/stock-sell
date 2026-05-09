import React from "react";

import {
    Link
} from "react-router-dom";

import "../assets/Signup.css";

const SubscriptionExpired = () => {

    return (

        <div className="auth-container">

            <div
                className="auth-box"
                style={{
                    textAlign: "center"
                }}
            >

                <h2>
                    Subscription Expired
                </h2>

                <p className="auth-subtitle">

                    Your subscription plan has expired
                    or is inactive.

                </p>

                <Link to="/plans">

                    <button
                        className="auth-btn"
                        style={{
                            marginTop: "15px",
                            background: "#334155"
                        }}
                    >

                        Select Plans

                    </button>

                </Link>

                <div
                    style={{
                        marginTop: "25px"
                    }}
                >

                    <h3
                        style={{
                            color: "#fff"
                        }}
                    >

                        Upgrade Your Plan

                    </h3>

                    <p
                        style={{
                            color: "#cbd5e1",
                            marginTop: "10px"
                        }}
                    >

                        Contact admin to renew your subscription.

                    </p>

                </div>

                {/* WHATSAPP */}

                <a
                    href="https://wa.me/919647255367"
                    target="_blank"
                    rel="noreferrer"
                >

                    <button
                        className="auth-btn"
                        style={{
                            marginTop: "25px"
                        }}
                    >

                        Contact Admin

                    </button>

                </a>

                {/* BACK */}

                <Link to="/login">

                    <button
                        className="auth-btn"
                        style={{
                            marginTop: "15px",
                            background: "#334155"
                        }}
                    >

                        Back To Login

                    </button>

                </Link>

            </div>

        </div>
    );
};

export default SubscriptionExpired;