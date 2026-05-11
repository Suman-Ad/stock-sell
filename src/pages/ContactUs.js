// src/pages/ContactUs.js

import React, { useState } from "react";

import {
    collection,
    addDoc,
    serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";

import "../assets/ContactUs.css";

const ContactUs = () => {

    const [form, setForm] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });

    const handleChange = (field, value) => {

        setForm(prev => ({
            ...prev,
            [field]: value
        }));

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            await addDoc(
                collection(db, "contactMessages"),
                {
                    name: form.name,
                    email: form.email,
                    subject: form.subject,
                    message: form.message,

                    status: "new",

                    createdAt: serverTimestamp()
                }
            );

            alert(
                "Message submitted successfully!"
            );

            setForm({
                name: "",
                email: "",
                subject: "",
                message: ""
            });

        } catch (err) {

            console.log(err);

            alert(err.message);

        }

    };

    return (

        <div className="contact-page">

            <div className="contact-overlay">

                <div className="contact-container">

                    {/* LEFT */}

                    <div className="contact-info">

                        <span className="contact-tag">
                            CONTACT SUPPORT
                        </span>

                        <h1>
                            Let’s Talk About Your Business
                        </h1>

                        <p>
                            Need help with your stock management,
                            subscription, orders, or account?
                            Our support team is ready to help you anytime.
                        </p>

                        <div className="info-card">
                            <h3>Email Support</h3>
                            <span>
                                support@stocksell.com
                            </span>
                        </div>

                        <div className="info-card">
                            <h3>Phone</h3>
                            <span>
                                +91 9647255367
                            </span>
                            <br />
                            <span>
                                +91 8910672774
                            </span>
                        </div>

                        <div className="info-card">
                            <h3>Business Hours</h3>
                            <span>
                                Mon - Sat | 9:00 AM - 8:00 PM
                            </span>
                        </div>

                    </div>

                    {/* RIGHT */}

                    <div className="contact-form-box">

                        <h2>
                            Send Message
                        </h2>

                        <form onSubmit={handleSubmit}>

                            <input
                                type="text"
                                placeholder="Full Name"
                                value={form.name}
                                onChange={(e) =>
                                    handleChange(
                                        "name",
                                        e.target.value
                                    )
                                }
                                required
                            />

                            <input
                                type="email"
                                placeholder="Email Address"
                                value={form.email}
                                onChange={(e) =>
                                    handleChange(
                                        "email",
                                        e.target.value
                                    )
                                }
                                required
                            />

                            <input
                                type="text"
                                placeholder="Subject"
                                value={form.subject}
                                onChange={(e) =>
                                    handleChange(
                                        "subject",
                                        e.target.value
                                    )
                                }
                                required
                            />

                            <textarea
                                placeholder="Write your message..."
                                value={form.message}
                                onChange={(e) =>
                                    handleChange(
                                        "message",
                                        e.target.value
                                    )
                                }
                                required
                            />

                            <button type="submit">
                                Send Message
                            </button>

                        </form>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default ContactUs;