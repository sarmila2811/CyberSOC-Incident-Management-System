package com.cybersoc.controller;

import com.cybersoc.dto.AuthResponse;
import com.cybersoc.model.User;
import com.cybersoc.service.UserService;
import com.cybersoc.service.OtpService;
import com.cybersoc.service.EmailService;
import com.cybersoc.service.AuditService;
import com.cybersoc.security.JwtUtil;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final OtpService otpService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public AuthController(UserService userService, OtpService otpService,
                          EmailService emailService, PasswordEncoder passwordEncoder,
                          AuditService auditService) {
        this.userService = userService;
        this.otpService = otpService;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    // ================= LOGIN =================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User req) {
        User loggedUser = userService.login(req.getUsername(), req.getPassword());

        if (loggedUser == null) {
            auditService.log(req.getUsername(), "USER LOGIN FAILED", null, null, null, "Invalid credentials or inactive status");
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid Username, Password, or account is Inactive."));
        }

        // Generate JWT token
        String token = JwtUtil.generateToken(loggedUser.getUsername());
        auditService.log(loggedUser.getUsername(), "USER LOGIN SUCCESS", null, null, null, "Authenticated session token generated");

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("id", loggedUser.getId());
        response.put("username", loggedUser.getUsername());
        response.put("role", loggedUser.getRole());
        response.put("email", loggedUser.getEmail() != null ? loggedUser.getEmail() : "");
        response.put("fullName", loggedUser.getFullName() != null ? loggedUser.getFullName() : "");
        response.put("phone", loggedUser.getPhone() != null ? loggedUser.getPhone() : "");
        response.put("department", loggedUser.getDepartment() != null ? loggedUser.getDepartment() : "");
        response.put("profileImage", loggedUser.getProfileImage() != null ? loggedUser.getProfileImage() : "");
        response.put("analystLevel", loggedUser.getAnalystLevel() != null ? loggedUser.getAnalystLevel() : "");
        response.put("specialization", loggedUser.getSpecialization() != null ? loggedUser.getSpecialization() : "");
        response.put("forcePasswordChange", loggedUser.getForcePasswordChange() != null ? loggedUser.getForcePasswordChange() : false);
        response.put("token", token);

        return ResponseEntity.ok(response);
    }

    // ================= SEND OTP =================
    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestParam String email) {
        // Enforce Unique Email
        if (userService.findByEmail(email).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("success", false, "message", "This email address is already registered. Please login or use another email."));
        }
        try {
            System.out.println("[OTP Workflow] Recipient email: " + email);
            String otp = otpService.generateOtp(email);
            System.out.println("[OTP Workflow] Generated OTP: " + otp);

            emailService.sendOtp(email, otp);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "OTP sent successfully."
            ));
        } catch (Exception e) {
            System.err.println("[OTP Workflow] Error sending OTP: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Unable to send OTP email.",
                "reason", e.getMessage() != null ? e.getMessage() : e.toString()
            ));
        }
    }

    // ================= VERIFY OTP =================
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestParam String email, @RequestParam String otp) {
        try {
            boolean isValid = otpService.verifyOtp(email, otp);
            if (isValid) {
                return ResponseEntity.ok(Map.of("message", "OTP verified successfully", "verified", true));
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid OTP", "verified", false));
            }
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage(), "verified", false));
        }
    }

    // ================= FORGOT PASSWORD =================
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        // Find if user with email exists
        Optional<User> userOpt = userService.getAllUsers().stream()
                .filter(u -> email.equalsIgnoreCase(u.getEmail()))
                .findFirst();

        if (userOpt.isEmpty()) {
            auditService.log("anonymous", "PASSWORD RESET REQUESTED FAIL", null, null, null, "No account registered with email: " + email);
            return ResponseEntity.badRequest().body(Map.of("message", "No account registered with this email"));
        }

        try {
            String otp = otpService.generateOtp(email);
            emailService.sendPasswordResetOtp(email, otp);
            auditService.log(userOpt.get().getUsername(), "PASSWORD RESET REQUESTED", null, null, null, "OTP verification sent to " + email);
            return ResponseEntity.ok(Map.of("message", "Password reset OTP sent to " + email));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Error sending reset OTP"));
        }
    }

    // ================= RESET PASSWORD =================
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        String otp = req.get("otp");
        String newPassword = req.get("password");

        if (email == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields"));
        }

        try {
            boolean isValid = otpService.verifyOtp(email, otp);
            if (!isValid) {
                auditService.log(email, "PASSWORD RESET FAIL", null, null, null, "Invalid OTP verification code");
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid OTP"));
            }
        } catch (IllegalStateException e) {
            auditService.log(email, "PASSWORD RESET FAIL", null, null, null, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        // Find user by email and reset password
        Optional<User> userOpt = userService.getAllUsers().stream()
                .filter(u -> email.equalsIgnoreCase(u.getEmail()))
                .findFirst();

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Encrypt and update
            user.setPassword(passwordEncoder.encode(newPassword));
            userService.save(user);
            otpService.clearOtp(email);
            auditService.log(user.getUsername(), "PASSWORD RESET SUCCESSFUL", null, null, null, "Credential updated successfully via OTP");
            return ResponseEntity.ok(Map.of("message", "Password reset successful"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }
    }
}