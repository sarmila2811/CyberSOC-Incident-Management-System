package com.cybersoc.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "otp_verification")
public class OtpVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String otp;

    private LocalDateTime generatedTime;
    private LocalDateTime expiryTime;
    private boolean verified = false;
    private int resendAttempts = 0;

    public OtpVerification() {
    }

    public OtpVerification(String email, String otp, LocalDateTime generatedTime, LocalDateTime expiryTime) {
        this.email = email;
        this.otp = otp;
        this.generatedTime = generatedTime;
        this.expiryTime = expiryTime;
        this.verified = false;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }

    public LocalDateTime getGeneratedTime() {
        return generatedTime;
    }

    public void setGeneratedTime(LocalDateTime generatedTime) {
        this.generatedTime = generatedTime;
    }

    public LocalDateTime getExpiryTime() {
        return expiryTime;
    }

    public void setExpiryTime(LocalDateTime expiryTime) {
        this.expiryTime = expiryTime;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public int getResendAttempts() {
        return resendAttempts;
    }

    public void setResendAttempts(int resendAttempts) {
        this.resendAttempts = resendAttempts;
    }
}
