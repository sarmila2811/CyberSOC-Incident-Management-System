package com.cybersoc.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cybersoc.model.PasswordResetToken;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByEmailAndToken(String email, String token);
    Optional<PasswordResetToken> findTopByEmailOrderByExpiryTimeDesc(String email);
}
