import React, { useState } from "react";
import { verifyOtp } from "../services/authService";

function OtpVerify({ email, onSuccess }) {

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);

    try {
      console.log("EMAIL =", email);
      console.log("OTP =", otp);

      const res = await verifyOtp(email, otp);

      console.log("RESPONSE =", res);

      // res is STRING (because service returns res.data)
      if (res.includes("LOGIN SUCCESS")) {
        onSuccess();
      } else {
        alert("Invalid OTP");
      }

    } catch (err) {
      console.log(err);
      alert("OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>

      <h3>Enter OTP</h3>

      <input
        type="text"
        placeholder="6 digit OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        style={{
          padding: "10px",
          width: "200px",
          textAlign: "center",
          fontSize: "16px"
        }}
      />

      <br /><br />

      <button
        onClick={handleVerify}
        disabled={loading}
        style={{
          padding: "10px 15px",
          background: "#22c55e",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        {loading ? "Verifying..." : "Verify OTP"}
      </button>

    </div>
  );
}

export default OtpVerify;