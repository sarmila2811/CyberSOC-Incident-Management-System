package com.cybersoc.controller;

import com.cybersoc.model.Notification;
import com.cybersoc.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // =========================
    // GET USER NOTIFICATIONS
    // =========================
    @GetMapping("/{username}")
    public ResponseEntity<?> getUserNotifications(@PathVariable String username) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        String principalUsername = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!principalUsername.equalsIgnoreCase(username) && !isAdmin) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied. Cannot view notifications of another user."));
        }

        List<Notification> notifs = notificationService.getUserNotifications(username, isAdmin);
        return ResponseEntity.ok(notifs);
    }

    // =========================
    // MARK ALL READ
    // =========================
    @PutMapping("/read/{username}")
    public ResponseEntity<?> markAllRead(@PathVariable String username) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        String principalUsername = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!principalUsername.equalsIgnoreCase(username) && !isAdmin) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).body(Map.of("message", "Access denied. Cannot modify notifications of another user."));
        }

        notificationService.markAllRead(username, isAdmin);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    // =========================
    // MARK SINGLE READ
    // =========================
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    // =========================
    // DELETE NOTIFICATION
    // =========================
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }
}