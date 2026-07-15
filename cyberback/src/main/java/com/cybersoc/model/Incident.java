package com.cybersoc.model;

import jakarta.persistence.*;

@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String priority; // Final Priority
    private String recommendedPriority;
    private String status; // Open, Under Investigation, Pending Approval, Closed, Reopened, Escalated
    
    @Column(columnDefinition = "TEXT")
    private String analystNotes;
    
    private String assignedTo; // username of analyst
    private String assignedAnalystName;
    private String category; // PHISHING, MALWARE, NETWORK, RANSOMWARE, etc.
    private String source; // Employee, Email, SIEM, etc.
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private String reportedBy;
    private String timestamp; // Creation time
    private String approvedBy;
    private String approvedTime;
    
    @Column(columnDefinition = "TEXT")
    private String resolutionSummary;
    
    @Column(columnDefinition = "TEXT")
    private String rejectionReason;
    
    private String escalationLevel; // L1, L2
    private String slaDeadline; // ISO date string of SLA deadline
    private String slaStatus;

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    private String customCategory;

    @Column(columnDefinition = "TEXT")
    private String aiRecommendedActions;

    private String updatedTime;
    private String resolvedTime;

    @Column(columnDefinition = "TEXT")
    private String adminRemarks;

    @Column(columnDefinition = "TEXT")
    private String aiAssistantSummary;

    @Column(columnDefinition = "TEXT")
    private String aiAssistantRootCause;

    @Column(columnDefinition = "TEXT")
    private String aiAssistantInvestigationSteps;

    @Column(columnDefinition = "TEXT")
    private String aiAssistantContainmentActions;

    @Column(columnDefinition = "TEXT")
    private String aiAssistantKeyIndicators;

    @Column(columnDefinition = "TEXT")
    private String aiAssistantRecommendedResolution;

    private String aiAssistantRiskLevel;
    private String aiAssistantConfidenceScore;

    @Column(name = "generated_time")
    private String aiAssistantGeneratedTime;

    private String previousPriority;

    private String aiRecommendationStatus = "Pending";

    @Column(columnDefinition = "TEXT")
    private String aiRejectionReason;

    @Column(columnDefinition = "TEXT")
    private String checklistState;

    private String createdTime;
    private String assignedTime;
    private String escalationTime;
    private String approvalTime;
    private String closedTime;
    private String approvedAt;
    private String rejectedBy;
    private String rejectedAt;

    private Double assignmentSpecScore;
    private Double assignmentWorkloadScore;
    private Double assignmentPerfScore;
    private Double assignmentFinalScore;

    @Column(columnDefinition = "TEXT")
    private String assignmentReason;

    private Integer routingConfidence;

    public Incident() {
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

    public String getAnalystNotes() {
        return analystNotes;
    }

    public void setAnalystNotes(String analystNotes) {
        this.analystNotes = analystNotes;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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

    public String getResolutionSummary() {
        return resolutionSummary;
    }

    public void setResolutionSummary(String resolutionSummary) {
        this.resolutionSummary = resolutionSummary;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(String approvedBy) {
        this.approvedBy = approvedBy;
    }

    public String getApprovedTime() {
        return approvedTime;
    }

    public void setApprovedTime(String approvedTime) {
        this.approvedTime = approvedTime;
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

    public String getAiSummary() {
        return aiSummary;
    }

    public void setAiSummary(String aiSummary) {
        this.aiSummary = aiSummary;
    }

    public String getCustomCategory() {
        return customCategory;
    }

    public void setCustomCategory(String customCategory) {
        this.customCategory = customCategory;
    }

    public String getAiRecommendedActions() {
        return aiRecommendedActions;
    }

    public void setAiRecommendedActions(String aiRecommendedActions) {
        this.aiRecommendedActions = aiRecommendedActions;
    }

    public String getUpdatedTime() {
        return updatedTime;
    }

    public void setUpdatedTime(String updatedTime) {
        this.updatedTime = updatedTime;
    }

    public String getResolvedTime() {
        return resolvedTime;
    }

    public void setResolvedTime(String resolvedTime) {
        this.resolvedTime = resolvedTime;
    }

    public String getAdminRemarks() {
        return adminRemarks;
    }

    public void setAdminRemarks(String adminRemarks) {
        this.adminRemarks = adminRemarks;
    }

    public String getAiAssistantSummary() {
        return aiAssistantSummary;
    }

    public void setAiAssistantSummary(String aiAssistantSummary) {
        this.aiAssistantSummary = aiAssistantSummary;
    }

    public String getAiAssistantRootCause() {
        return aiAssistantRootCause;
    }

    public void setAiAssistantRootCause(String aiAssistantRootCause) {
        this.aiAssistantRootCause = aiAssistantRootCause;
    }

    public String getAiAssistantInvestigationSteps() {
        return aiAssistantInvestigationSteps;
    }

    public void setAiAssistantInvestigationSteps(String aiAssistantInvestigationSteps) {
        this.aiAssistantInvestigationSteps = aiAssistantInvestigationSteps;
    }

    public String getAiAssistantContainmentActions() {
        return aiAssistantContainmentActions;
    }

    public void setAiAssistantContainmentActions(String aiAssistantContainmentActions) {
        this.aiAssistantContainmentActions = aiAssistantContainmentActions;
    }

    public String getCreatedTime() {
        return createdTime;
    }

    public void setCreatedTime(String createdTime) {
        this.createdTime = createdTime;
    }

    public String getAssignedTime() {
        return assignedTime;
    }

    public void setAssignedTime(String assignedTime) {
        this.assignedTime = assignedTime;
    }

    public String getEscalationTime() {
        return escalationTime;
    }

    public void setEscalationTime(String escalationTime) {
        this.escalationTime = escalationTime;
    }

    public String getApprovalTime() {
        return approvalTime;
    }

    public void setApprovalTime(String approvalTime) {
        this.approvalTime = approvalTime;
    }

    public String getClosedTime() {
        return closedTime;
    }

    public void setClosedTime(String closedTime) {
        this.closedTime = closedTime;
    }

    public String getAiAssistantKeyIndicators() {
        return aiAssistantKeyIndicators;
    }

    public void setAiAssistantKeyIndicators(String aiAssistantKeyIndicators) {
        this.aiAssistantKeyIndicators = aiAssistantKeyIndicators;
    }

    public String getAiAssistantRecommendedResolution() {
        return aiAssistantRecommendedResolution;
    }

    public void setAiAssistantRecommendedResolution(String aiAssistantRecommendedResolution) {
        this.aiAssistantRecommendedResolution = aiAssistantRecommendedResolution;
    }

    public String getAiAssistantRiskLevel() {
        return aiAssistantRiskLevel;
    }

    public void setAiAssistantRiskLevel(String aiAssistantRiskLevel) {
        this.aiAssistantRiskLevel = aiAssistantRiskLevel;
    }

    public String getAiAssistantConfidenceScore() {
        return aiAssistantConfidenceScore;
    }

    public void setAiAssistantConfidenceScore(String aiAssistantConfidenceScore) {
        this.aiAssistantConfidenceScore = aiAssistantConfidenceScore;
    }

    public String getAiAssistantGeneratedTime() {
        return aiAssistantGeneratedTime;
    }

    public void setAiAssistantGeneratedTime(String aiAssistantGeneratedTime) {
        this.aiAssistantGeneratedTime = aiAssistantGeneratedTime;
    }

    public String getPreviousPriority() {
        return previousPriority;
    }

    public void setPreviousPriority(String previousPriority) {
        this.previousPriority = previousPriority;
    }

    public String getAiRecommendationStatus() {
        return aiRecommendationStatus;
    }

    public void setAiRecommendationStatus(String aiRecommendationStatus) {
        this.aiRecommendationStatus = aiRecommendationStatus;
    }

    public String getAiRejectionReason() {
        return aiRejectionReason;
    }

    public void setAiRejectionReason(String aiRejectionReason) {
        this.aiRejectionReason = aiRejectionReason;
    }

    public String getChecklistState() {
        return checklistState;
    }

    public void setChecklistState(String checklistState) {
        this.checklistState = checklistState;
    }

    public String getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(String approvedAt) {
        this.approvedAt = approvedAt;
    }

    public String getRejectedBy() {
        return rejectedBy;
    }

    public void setRejectedBy(String rejectedBy) {
        this.rejectedBy = rejectedBy;
    }

    public String getRejectedAt() {
        return rejectedAt;
    }

    public void setRejectedAt(String rejectedAt) {
        this.rejectedAt = rejectedAt;
    }

    public Double getAssignmentSpecScore() {
        return assignmentSpecScore;
    }

    public void setAssignmentSpecScore(Double assignmentSpecScore) {
        this.assignmentSpecScore = assignmentSpecScore;
    }

    public Double getAssignmentWorkloadScore() {
        return assignmentWorkloadScore;
    }

    public void setAssignmentWorkloadScore(Double assignmentWorkloadScore) {
        this.assignmentWorkloadScore = assignmentWorkloadScore;
    }

    public Double getAssignmentPerfScore() {
        return assignmentPerfScore;
    }

    public void setAssignmentPerfScore(Double assignmentPerfScore) {
        this.assignmentPerfScore = assignmentPerfScore;
    }

    public Double getAssignmentFinalScore() {
        return assignmentFinalScore;
    }

    public void setAssignmentFinalScore(Double assignmentFinalScore) {
        this.assignmentFinalScore = assignmentFinalScore;
    }

    public String getAssignmentReason() {
        return assignmentReason;
    }

    public void setAssignmentReason(String assignmentReason) {
        this.assignmentReason = assignmentReason;
    }

    public String getSlaStatus() {
        return slaStatus;
    }

    public void setSlaStatus(String slaStatus) {
        this.slaStatus = slaStatus;
    }

    public Integer getRoutingConfidence() {
        return routingConfidence;
    }

    public void setRoutingConfidence(Integer routingConfidence) {
        this.routingConfidence = routingConfidence;
    }
}
