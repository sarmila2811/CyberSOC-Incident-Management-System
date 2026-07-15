package com.cybersoc.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.cybersoc.dto.AuthResponse;
import com.cybersoc.model.User;
import com.cybersoc.model.OtpVerification;
import com.cybersoc.repository.OtpVerificationRepository;
import com.cybersoc.security.JwtUtil;
import com.cybersoc.service.UserService;
import com.cybersoc.service.AuditService;

import java.io.File;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService service;
    private final OtpVerificationRepository otpVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final com.cybersoc.service.NotificationService notificationService;
    private final com.cybersoc.service.EmailService emailService;

    public UserController(UserService service, OtpVerificationRepository otpVerificationRepository, 
                          PasswordEncoder passwordEncoder, AuditService auditService,
                          com.cybersoc.service.NotificationService notificationService,
                          com.cybersoc.service.EmailService emailService) {
        this.service = service;
        this.otpVerificationRepository = otpVerificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    private boolean isPasswordSecure(String pw) {
        if (pw == null || pw.length() < 8) return false;
        boolean hasUpper = pw.chars().anyMatch(Character::isUpperCase);
        boolean hasLower = pw.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit = pw.chars().anyMatch(Character::isDigit);
        boolean hasSpecial = pw.chars().anyMatch(c -> "!@#$%^&*(),.?\":{}|<>".indexOf(c) >= 0);
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }

    // ================= GET ALL USERS =================
    @GetMapping
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(service.getAllUsers());
    }

    // ================= GET BY ID =================
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        User user = service.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(user);
    }

    // ================= GET BY USERNAME =================
    @GetMapping("/username/{username}")
    public ResponseEntity<?> getUserByUsername(@PathVariable String username) {
        return service.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ================= SIGNUP WITH OTP CHECK =================
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        // 1. Enforce OTP verification check
        Optional<OtpVerification> verificationOpt = otpVerificationRepository
                .findTopByEmailOrderByExpiryTimeDesc(user.getEmail());

        if (verificationOpt.isEmpty() || !verificationOpt.get().isVerified()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email not verified. Please verify OTP first."));
        }

        // 2. Enforce Unique Username
        if (service.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("message", "Username already exists. Please choose another username."));
        }

        // 3. Enforce Unique Email
        if (service.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("message", "This email address is already registered. Please login or use another email."));
        }

        // 4. Enforce Password Strength Constraints
        if (!isPasswordSecure(user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password does not conform to safety policies. Minimum 8 characters, one uppercase, one lowercase, one number, and one special character required."));
        }

        // Configure default user fields
        user.setResolvedCount(0);
        user.setLastLogin(null);
        user.setProfileImage(null);
        user.setStatus("ACTIVE");
        if ("EMPLOYEE".equalsIgnoreCase(user.getRole())) {
            user.setAnalystLevel(null);
            user.setSpecialization(null);
        }

        User savedUser = service.register(user);

        if (savedUser == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Registration failed."));
        }

        // Clear verification record
        OtpVerification verification = verificationOpt.get();
        otpVerificationRepository.delete(verification);

        // Notify Admins about registration
        if ("ANALYST".equalsIgnoreCase(savedUser.getRole())) {
            notificationService.send(new com.cybersoc.model.Notification(
                    "REGISTRATION",
                    "New Analyst Registered: " + savedUser.getUsername() + " (" + (savedUser.getFullName() != null ? savedUser.getFullName() : savedUser.getUsername()) + ")",
                    "admin"
            ));
        } else if ("EMPLOYEE".equalsIgnoreCase(savedUser.getRole())) {
            notificationService.send(new com.cybersoc.model.Notification(
                    "REGISTRATION",
                    "New Employee Registered: " + savedUser.getUsername() + " (" + (savedUser.getFullName() != null ? savedUser.getFullName() : savedUser.getUsername()) + ")",
                    "admin"
            ));
        }

        // Audit Log
        auditService.log(savedUser.getUsername(), "USER SIGNUP SUCCESS", null, null, null, "Account created dynamically after OTP verification");

        return ResponseEntity.ok(savedUser);
    }

    // ================= SIGNUP BYPASS FOR ADMINS =================
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        // Enforce Unique Username
        if (service.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("message", "Username already exists. Please choose another username."));
        }

        // Enforce Unique Email
        if (service.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.status(409)
                    .body(Map.of("message", "This email address is already registered. Please login or use another email."));
        }

        // Generate temporary password
        String tempPassword = "Temp@" + String.format("%04d", 1000 + new java.util.Random().nextInt(9000));
        user.setPassword(tempPassword);
        user.setForcePasswordChange(true);

        // Configure default user fields
        user.setResolvedCount(0);
        user.setLastLogin(null);
        user.setProfileImage(null);
        user.setStatus("ACTIVE");
        if ("EMPLOYEE".equalsIgnoreCase(user.getRole())) {
            user.setAnalystLevel(null);
            user.setSpecialization(null);
        }

        User savedUser = service.register(user);
        if (savedUser == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Failed to register user."));
        }

        // Send Welcome Email
        try {
            emailService.sendEmail(savedUser.getEmail(), "Welcome to CyberSOC - Account Created",
                "Your CyberSOC account has been created by the administrator.\n\n" +
                "Username: " + savedUser.getUsername() + "\n" +
                "Temporary Password: " + tempPassword + "\n\n" +
                "Please log in and change your password immediately upon your first login.");
        } catch (Exception e) {
            System.err.println("Failed to send welcome email: " + e.getMessage());
        }

        // Return user info and temp password
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("id", savedUser.getId());
        response.put("username", savedUser.getUsername());
        response.put("email", savedUser.getEmail());
        response.put("role", savedUser.getRole());
        response.put("status", savedUser.getStatus());
        response.put("tempPassword", tempPassword);
        response.put("forcePasswordChange", savedUser.getForcePasswordChange());

        return ResponseEntity.ok(response);
    }

    // ================= CHANGE PASSWORD FORCED =================
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> req) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        String username = auth.getName();
        Optional<User> userOpt = service.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        User user = userOpt.get();
        String newPassword = req.get("password");
        if (newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password cannot be empty."));
        }

        if (!isPasswordSecure(newPassword)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 8 characters long and contain uppercase, lowercase, digit, and special characters."));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setForcePasswordChange(false);
        service.save(user);

        auditService.log(username, "PASSWORD CHANGE SUCCESS", null, null, null, "Forced password change completed successfully");

        return ResponseEntity.ok(Map.of("message", "Password changed successfully", "forcePasswordChange", false));
    }

    // ================= UPDATE USER =================
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User req) {
        User user = service.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getEmail() != null) user.setEmail(req.getEmail());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getDepartment() != null) user.setDepartment(req.getDepartment());
        if (req.getProfileImage() != null) user.setProfileImage(req.getProfileImage());
        
        // Admin mappings
        if (req.getRole() != null) user.setRole(req.getRole());
        if (req.getAnalystLevel() != null) user.setAnalystLevel(req.getAnalystLevel());
        if (req.getSpecialization() != null) user.setSpecialization(req.getSpecialization());
        if (req.getStatus() != null) user.setStatus(req.getStatus());

        if (req.getPassword() != null && !req.getPassword().isEmpty()) {
            if (!isPasswordSecure(req.getPassword())) {
                return ResponseEntity.badRequest().body(Map.of("message", "New password must comply with complexity rules."));
            }
            user.setPassword(passwordEncoder.encode(req.getPassword()));
        }

        User updated = service.save(user);

        // Generate profile updated notification
        notificationService.send(new com.cybersoc.model.Notification(
                "PROFILE_UPDATED",
                "Your user profile details have been successfully updated.",
                updated.getUsername()
        ));

        return ResponseEntity.ok(updated);
    }

    // ================= UPDATE STATUS =================
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> req) {
        User user = service.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        String status = req.get("status");
        if (status != null) {
            user.setStatus(status.toUpperCase());
            service.save(user);
        }
        return ResponseEntity.ok(user);
    }

    // ================= RESET PASSWORD =================
    @PutMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> req) {
        User user = service.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        String newPassword = req.get("password");
        if (newPassword != null) {
            if (!isPasswordSecure(newPassword)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Password must comply with complexity rules."));
            }
            user.setPassword(passwordEncoder.encode(newPassword));
            service.save(user);
            auditService.log(
                    user.getUsername(),
                    "PASSWORD_CHANGED_BY_ADMIN",
                    null,
                    null,
                    null,
                    "Password updated successfully by Administrator"
            );
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        }
        return ResponseEntity.badRequest().body(Map.of("message", "Password parameter missing"));
    }

    // ================= UPLOAD PROFILE IMAGE =================
    @PostMapping("/{id}/profile-image")
    public ResponseEntity<?> uploadProfileImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        User user = service.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Security check: Only allow users to modify their own profile image or Admins
        String authUsername = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        boolean isAdmin = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority()));
        if (authUsername == null || (!authUsername.equalsIgnoreCase(user.getUsername()) && !isAdmin)) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden. You are not authorized to upload a profile image for this account."));
        }

        // Validate file presence
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty. Please select a file to upload."));
        }

        // Validate file size (5MB = 5 * 1024 * 1024 bytes)
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "File size exceeds the maximum limit of 5 MB."));
        }

        // Validate file extension / content type
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        String ext = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        }

        if (!ext.equals(".jpg") && !ext.equals(".jpeg") && !ext.equals(".png") &&
            !"image/jpeg".equalsIgnoreCase(contentType) && !"image/png".equalsIgnoreCase(contentType)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid file format. Only JPG, JPEG, and PNG formats are allowed."));
        }

        try {
            // Ensure uploads/profile directory exists using absolute path to CWD
            java.nio.file.Path uploadPath = java.nio.file.Paths.get("uploads/profile").toAbsolutePath().normalize();
            if (!java.nio.file.Files.exists(uploadPath)) {
                java.nio.file.Files.createDirectories(uploadPath);
            }

            // Save the file with a unique name
            String uniqueName = System.currentTimeMillis() + "_" + user.getUsername() + ext;
            java.nio.file.Path filePath = uploadPath.resolve(uniqueName);
            java.nio.file.Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // Store relative path in database and remove old physical file
            String oldImage = user.getProfileImage();
            if (oldImage != null) {
                try {
                    String relativePath = oldImage.startsWith("/") ? oldImage.substring(1) : oldImage;
                    java.nio.file.Path oldPath = java.nio.file.Paths.get(relativePath).toAbsolutePath().normalize();
                    if (java.nio.file.Files.exists(oldPath)) {
                        java.nio.file.Files.delete(oldPath);
                    }
                } catch (Exception e) {
                    // Ignore deletion exceptions
                }
            }

            String newPath = "/uploads/profile/" + uniqueName;
            user.setProfileImage(newPath);
            service.save(user);

            // Generate notification for profile update
            notificationService.send(new com.cybersoc.model.Notification(
                    "PROFILE_UPDATED",
                    "Your profile picture has been successfully uploaded and updated.",
                    user.getUsername()
            ));

            // Audit log
            auditService.log(
                    user.getUsername(),
                    "PROFILE_IMAGE_UPLOADED",
                    null,
                    null,
                    oldImage != null ? oldImage : "None",
                    newPath,
                    null,
                    "Uploaded profile image: " + uniqueName
            );

            return ResponseEntity.ok(Map.of("profileImage", newPath, "message", "Profile image updated successfully."));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to save profile image: " + e.getMessage()));
        }
    }

    // ================= REMOVE PROFILE IMAGE =================
    @DeleteMapping("/{id}/profile-image")
    public ResponseEntity<?> removeProfileImage(@PathVariable Long id) {
        User user = service.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Security check: Only allow users to modify their own profile image or Admins
        String authUsername = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        boolean isAdmin = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority()));
        if (authUsername == null || (!authUsername.equalsIgnoreCase(user.getUsername()) && !isAdmin)) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden. You are not authorized to remove the profile image for this account."));
        }

        String oldImage = user.getProfileImage();
        if (oldImage == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "No profile image to remove."));
        }

        // Set to null in DB
        user.setProfileImage(null);
        service.save(user);

        // Delete the physical file from uploads folder if it exists
        try {
            String filePath = oldImage.startsWith("/") ? oldImage.substring(1) : oldImage;
            File file = new File(filePath);
            if (file.exists()) {
                file.delete();
            }
        } catch (Exception e) {
            // Ignore delete errors
        }

        // Audit log
        auditService.log(
                user.getUsername(),
                "PROFILE_IMAGE_REMOVED",
                null,
                null,
                oldImage,
                "None",
                null,
                "Removed profile image"
        );

        return ResponseEntity.ok(Map.of("message", "Profile image removed successfully."));
    }

    // ================= DELETE USER =================
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = service.getById(id);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        service.delete(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    // ================= COMPATIBILITY LOGIN =================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {
        User loggedUser = service.login(user.getUsername(), user.getPassword());

        if (loggedUser == null) {
            auditService.log(user.getUsername(), "USER LOGIN FAILED", null, null, null, "Invalid credentials or inactive status");
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid Username, Password, or account is Inactive."));
        }

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
}