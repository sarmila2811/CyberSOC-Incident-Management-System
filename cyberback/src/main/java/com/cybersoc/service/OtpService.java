package com.cybersoc.service;

import org.springframework.stereotype.Service;
import com.cybersoc.model.OtpVerification;
import com.cybersoc.repository.OtpVerificationRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class OtpService {

    public static final int OTP_EXPIRY_MINUTES = 5;

    private final OtpVerificationRepository otpRepository;

    public OtpService(OtpVerificationRepository otpRepository) {
        this.otpRepository = otpRepository;
    }

    // GENERATE OTP
    public String generateOtp(String email) {
        Optional<OtpVerification> existingOpt = otpRepository.findTopByEmailOrderByExpiryTimeDesc(email);
        int resendAttempts = 0;

        if (existingOpt.isPresent()) {
            OtpVerification existing = existingOpt.get();
            // Check 60-second restriction
            long secondsSinceLast = Duration.between(existing.getGeneratedTime(), LocalDateTime.now()).getSeconds();
            if (secondsSinceLast < 60) {
                throw new IllegalStateException("Please wait " + (60 - secondsSinceLast) + " seconds before resending OTP");
            }
            resendAttempts = existing.getResendAttempts() + 1;
        }

        // Invalidate all previous active OTPs for this email
        List<OtpVerification> previousOtps = otpRepository.findByEmail(email);
        for (OtpVerification prev : previousOtps) {
            if (!prev.isVerified()) {
                prev.setVerified(true);
                otpRepository.save(prev);
            }
        }

        String otp = String.format("%06d", 100000 + new Random().nextInt(900000));
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiry = now.plusMinutes(OTP_EXPIRY_MINUTES);

        OtpVerification newOtp = new OtpVerification(email, otp, now, expiry);
        newOtp.setResendAttempts(resendAttempts);
        otpRepository.save(newOtp);

        System.out.println("OTP GENERATED FOR " + email + ": " + otp);
        return otp;
    }

    // VERIFY OTP
    public boolean verifyOtp(String email, String otp) {
        Optional<OtpVerification> otpOpt = otpRepository.findTopByEmailOrderByExpiryTimeDesc(email);

        if (otpOpt.isPresent()) {
            OtpVerification verification = otpOpt.get();
            
            if (verification.isVerified()) {
                System.out.println("OTP already verified/used");
                return false;
            }

            if (LocalDateTime.now().isAfter(verification.getExpiryTime())) {
                System.out.println("OTP expired");
                throw new IllegalStateException("OTP has expired. Please request a new OTP.");
            }

            if (verification.getOtp().equals(otp)) {
                verification.setVerified(true);
                otpRepository.save(verification);
                return true;
            }
        }

        return false;
    }

    // CLEAR OTP
    public void clearOtp(String email) {
        // Mark as verified/used so it cannot be used again
        Optional<OtpVerification> otpOpt = otpRepository.findTopByEmailOrderByExpiryTimeDesc(email);
        if (otpOpt.isPresent()) {
            OtpVerification verification = otpOpt.get();
            verification.setVerified(true);
            otpRepository.save(verification);
        }
    }
}