package com.cybersoc.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cybersoc.model.OtpVerification;
import java.util.Optional;
import java.util.List;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findTopByEmailOrderByExpiryTimeDesc(String email);
    Optional<OtpVerification> findByEmailAndOtp(String email, String otp);
    List<OtpVerification> findByEmail(String email);
}
