package com.cybersoc.dto;

import com.cybersoc.model.Incident;

public class IncidentSummaryDTO {
    private Long id;
    private String title;
    private String priority;
    private String recommendedPriority;
    private String status;
    private String assignedTo;
    private String assignedAnalystName;
    private String category;
    private String source;
    private String reportedBy;
    private String timestamp;
    private String escalationLevel;
    private String slaDeadline;
    private String slaStatus;

    public IncidentSummaryDTO(Incident incident) {
        this.id = incident.getId();
        this.title = incident.getTitle();
        this.priority = incident.getPriority();
        this.recommendedPriority = incident.getRecommendedPriority();
        this.status = incident.getStatus();
        this.assignedTo = incident.getAssignedTo();
        this.assignedAnalystName = incident.getAssignedAnalystName();
        this.category = incident.getCategory();
        this.source = incident.getSource();
        this.reportedBy = incident.getReportedBy();
        this.timestamp = incident.getTimestamp();
        this.escalationLevel = incident.getEscalationLevel();
        this.slaDeadline = incident.getSlaDeadline();
        this.slaStatus = incident.getSlaStatus();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getRecommendedPriority() {
        return recommendedPriority;
    }

    public void setRecommendedPriority(String recommendedPriority) {
        this.recommendedPriority = recommendedPriority;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }

    public String getAssignedAnalystName() {
        return assignedAnalystName;
    }

    public void setAssignedAnalystName(String assignedAnalystName) {
        this.assignedAnalystName = assignedAnalystName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getReportedBy() {
        return reportedBy;
    }

    public void setReportedBy(String reportedBy) {
        this.reportedBy = reportedBy;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getEscalationLevel() {
        return escalationLevel;
    }

    public void setEscalationLevel(String escalationLevel) {
        this.escalationLevel = escalationLevel;
    }

    public String getSlaDeadline() {
        return slaDeadline;
    }

    public void setSlaDeadline(String slaDeadline) {
        this.slaDeadline = slaDeadline;
    }

    public String getSlaStatus() {
        return slaStatus;
    }

    public void setSlaStatus(String slaStatus) {
        this.slaStatus = slaStatus;
    }
}
