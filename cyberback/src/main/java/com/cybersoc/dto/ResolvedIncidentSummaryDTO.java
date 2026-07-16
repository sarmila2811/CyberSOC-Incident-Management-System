package com.cybersoc.dto;

import com.cybersoc.model.ResolvedIncident;

public class ResolvedIncidentSummaryDTO {
    private Long id;
    private Long incidentId;
    private String title;
    private String category;
    private String priority;
    private String assignedAnalyst;
    private String resolvedTime;
    private String reportedBy;
    private String timestamp;
    private String slaStatus;
    private String resolutionSummary;

    public ResolvedIncidentSummaryDTO(ResolvedIncident resolved) {
        this.id = resolved.getId();
        this.incidentId = resolved.getIncidentId();
        this.title = resolved.getTitle();
        this.category = resolved.getCategory();
        this.priority = resolved.getPriority();
        this.assignedAnalyst = resolved.getAssignedAnalyst();
        this.resolvedTime = resolved.getResolvedTime();
        this.reportedBy = resolved.getReportedBy();
        this.timestamp = resolved.getTimestamp();
        this.slaStatus = resolved.getSlaStatus();
        this.resolutionSummary = resolved.getResolutionSummary();
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getAssignedAnalyst() {
        return assignedAnalyst;
    }

    public void setAssignedAnalyst(String assignedAnalyst) {
        this.assignedAnalyst = assignedAnalyst;
    }

    public String getResolvedTime() {
        return resolvedTime;
    }

    public void setResolvedTime(String resolvedTime) {
        this.resolvedTime = resolvedTime;
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

    public String getSlaStatus() {
        return slaStatus;
    }

    public void setSlaStatus(String slaStatus) {
        this.slaStatus = slaStatus;
    }

    public String getResolutionSummary() {
        return resolutionSummary;
    }

    public void setResolutionSummary(String resolutionSummary) {
        this.resolutionSummary = resolutionSummary;
    }
}
