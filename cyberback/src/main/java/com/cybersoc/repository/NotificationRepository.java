package com.cybersoc.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cybersoc.model.Notification;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserOrderByTimestampDescIdDesc(String user);
    List<Notification> findByUserOrUserOrderByTimestampDescIdDesc(String user1, String user2);
    List<Notification> findByUserAndTypeAndMessage(String user, String type, String message);
}
