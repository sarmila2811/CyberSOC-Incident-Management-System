package com.cybersoc.service;

import com.cybersoc.model.Notification;
import com.cybersoc.repository.NotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate template;

    public NotificationService(NotificationRepository notificationRepository, SimpMessagingTemplate template) {
        this.notificationRepository = notificationRepository;
        this.template = template;
    }

    // =========================
    // GET ALL NOTIFICATIONS
    // =========================
    public List<Notification> getAllNotifications() {
        return notificationRepository.findAll();
    }

    // =========================
    // SAVE & SEND NOTIFICATION
    // =========================
    public void send(Notification notification) {
        try {
            // Check if identical notification already exists to prevent duplicates
            List<Notification> existing = notificationRepository.findByUserAndTypeAndMessage(
                    notification.getUser(), notification.getType(), notification.getMessage()
            );
            if (existing != null && !existing.isEmpty()) {
                System.out.println("Duplicate notification skipped for user " + notification.getUser() + ": " + notification.getMessage());
                return;
            }

            notification.setRead(false);
            Notification saved = notificationRepository.save(notification);

            // REAL TIME PUSH (STOMP WebSocket)
            template.convertAndSend("/topic/notifications", saved);

            System.out.println("Notification saved & sent to user " + notification.getUser() + ": " + notification.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public List<Notification> getUserNotifications(String username, boolean isAdmin) {
        if (isAdmin) {
            return notificationRepository.findByUserOrUserOrderByTimestampDescIdDesc(username, "admin");
        } else {
            return notificationRepository.findByUserOrderByTimestampDescIdDesc(username);
        }
    }

    // =========================
    // MARK ALL READ
    // =========================
    public void markAllRead(String username, boolean isAdmin) {
        List<Notification> userNotifications;
        if (isAdmin) {
            userNotifications = notificationRepository.findByUserOrUserOrderByTimestampDescIdDesc(username, "admin");
        } else {
            userNotifications = notificationRepository.findByUserOrderByTimestampDescIdDesc(username);
        }
        for (Notification n : userNotifications) {
            if (!n.isRead()) {
                n.setRead(true);
            }
        }
        notificationRepository.saveAll(userNotifications);
    }

    // =========================
    // MARK SINGLE READ
    // =========================
    public void markAsRead(Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    // =========================
    // DELETE NOTIFICATION
    // =========================
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }
}