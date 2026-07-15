package com.cybersoc.service;

import com.cybersoc.model.AuditLog;
import com.cybersoc.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // =========================
    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    // =========================
    public void log(String user, String action, String incidentId, String incidentTitle, String oldValue, String newValue) {
        try {
            if (incidentId != null && !incidentId.trim().isEmpty()) {
                List<AuditLog> existing = auditLogRepository.findByIncidentIdOrderByTimestampAsc(incidentId);
                for (AuditLog ext : existing) {
                    if (java.util.Objects.equals(ext.getAction(), action) &&
                        java.util.Objects.equals(ext.getOldValue(), oldValue) &&
                        java.util.Objects.equals(ext.getNewValue(), newValue)) {
                        System.out.println("Duplicate identical audit event ignored: " + action + " for incident " + incidentId);
                        return;
                    }
                }
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

            AuditLog log = new AuditLog();
            log.setUser(user);
            log.setAction(action);
            log.setIncidentId(incidentId);
            log.setIncidentTitle(incidentTitle);
            log.setOldValue(oldValue);
            log.setNewValue(newValue);
            log.setTimestamp(timestamp);
            log.setRemarks("System logged activity");

            auditLogRepository.save(log);
            System.out.println("Audit log saved: " + action + " for incident " + incidentId);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void log(String user, String action, String incidentId, String incidentTitle, String oldValue, String newValue, String ipAddress, String remarks) {
        try {
            if (incidentId != null && !incidentId.trim().isEmpty()) {
                List<AuditLog> existing = auditLogRepository.findByIncidentIdOrderByTimestampAsc(incidentId);
                for (AuditLog ext : existing) {
                    if (java.util.Objects.equals(ext.getAction(), action) &&
                        java.util.Objects.equals(ext.getOldValue(), oldValue) &&
                        java.util.Objects.equals(ext.getNewValue(), newValue) &&
                        java.util.Objects.equals(ext.getRemarks(), remarks)) {
                        System.out.println("Duplicate detailed identical audit event ignored: " + action + " for incident " + incidentId);
                        return;
                    }
                }
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

            AuditLog log = new AuditLog();
            log.setUser(user);
            log.setAction(action);
            log.setIncidentId(incidentId);
            log.setIncidentTitle(incidentTitle);
            log.setOldValue(oldValue);
            log.setNewValue(newValue);
            log.setTimestamp(timestamp);
            log.setIpAddress(ipAddress);
            log.setRemarks(remarks);

            auditLogRepository.save(log);
            System.out.println("Detailed audit log saved: " + action);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public List<AuditLog> getLogsByIncident(String incidentId) {
        return auditLogRepository.findByIncidentIdOrderByTimestampAsc(incidentId);
    }
}