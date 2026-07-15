package com.cybersoc.service;

import com.cybersoc.model.Incident;
import com.cybersoc.model.EscalationHistory;
import com.cybersoc.model.Notification;
import com.cybersoc.model.User;
import com.cybersoc.repository.IncidentRepository;
import com.cybersoc.repository.EscalationHistoryRepository;
import com.cybersoc.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class SlaService {

    private final IncidentRepository incidentRepository;
    private final EscalationHistoryRepository escalationHistoryRepository;
    private final UserRepository userRepository;
    private final AnalystAssignmentService assignmentService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditService auditService;

    public SlaService(IncidentRepository incidentRepository,
                      EscalationHistoryRepository escalationHistoryRepository,
                      UserRepository userRepository,
                      AnalystAssignmentService assignmentService,
                      NotificationService notificationService,
                      EmailService emailService,
                      AuditService auditService) {
        this.incidentRepository = incidentRepository;
        this.escalationHistoryRepository = escalationHistoryRepository;
        this.userRepository = userRepository;
        this.assignmentService = assignmentService;
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.auditService = auditService;
    }

    private String calculateSlaDeadline(String priority) {
        LocalDateTime now = LocalDateTime.now();
        if ("Critical".equalsIgnoreCase(priority)) {
            return now.plusHours(2).toString();
        } else if ("High".equalsIgnoreCase(priority)) {
            return now.plusHours(4).toString();
        } else if ("Medium".equalsIgnoreCase(priority)) {
            return now.plusHours(8).toString();
        } else if ("Low".equalsIgnoreCase(priority)) {
            return now.plusHours(24).toString();
        }
        return now.plusHours(8).toString(); // Default Medium
    }

    // Run every 10 seconds to monitor active SLA deadlines
    @Scheduled(fixedDelay = 10000)
    public void monitorSlaDeadlines() {
        List<Incident> activeIncidents = incidentRepository.findAll();

        for (Incident incident : activeIncidents) {
            String status = incident.getStatus();
            
            // Skip resolved or pending approval
            if ("Closed".equalsIgnoreCase(status) || 
                "CLOSED".equalsIgnoreCase(status) ||
                "Pending Approval".equalsIgnoreCase(status) ||
                "PENDING_ADMIN_APPROVAL".equalsIgnoreCase(status) ||
                "PENDING_APPROVAL".equalsIgnoreCase(status) ||
                "RESOLVED".equalsIgnoreCase(status)) {
                continue;
            }

            if (incident.getSlaDeadline() == null) {
                continue;
            }

            try {
                LocalDateTime deadline = LocalDateTime.parse(incident.getSlaDeadline());
                if (LocalDateTime.now().isAfter(deadline)) {
                    // Breached! Auto-Escalate
                    autoEscalate(incident);
                }
            } catch (Exception e) {
                System.err.println("Error checking SLA for Incident " + incident.getId() + ": " + e.getMessage());
            }
        }
    }

    private void autoEscalate(Incident incident) {
        String oldLevel = incident.getEscalationLevel() != null ? incident.getEscalationLevel() : "L1";
        assignmentService.escalateIncident(incident, "System", oldLevel + " SLA Breached");
    }
}
