package com.cybersoc.model;

import jakarta.persistence.*;

@Entity
@Table(name = "escalation_history")
public class EscalationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long incidentId;
    private String oldAnalyst;
    private String newAnalyst;
    private String oldLevel;
    private String newLevel;
    
    @Column(columnDefinition = "TEXT")
    private String reason;
    
    private String escalatedTime;
    private String triggeredBy; // Automatic / Manual

    public EscalationHistory() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getIncidentId() {
        return incidentId;
    }

    public void setIncidentId(Long incidentId) {
        this.incidentId = incidentId;
    }

    public String getOldAnalyst() {
        return oldAnalyst;
    }

    public void setOldAnalyst(String oldAnalyst) {
        this.oldAnalyst = oldAnalyst;
    }

    public String getNewAnalyst() {
        return newAnalyst;
    }

    public void setNewAnalyst(String newAnalyst) {
        this.newAnalyst = newAnalyst;
    }

    public String getOldLevel() {
        return oldLevel;
    }

    public void setOldLevel(String oldLevel) {
        this.oldLevel = oldLevel;
    }

    public String getNewLevel() {
        return newLevel;
    }

    public void setNewLevel(String newLevel) {
        this.newLevel = newLevel;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getEscalatedTime() {
        return escalatedTime;
    }

    public void setEscalatedTime(String escalatedTime) {
        this.escalatedTime = escalatedTime;
    }

    public String getTriggeredBy() {
        return triggeredBy;
    }

    public void setTriggeredBy(String triggeredBy) {
        this.triggeredBy = triggeredBy;
    }
}
