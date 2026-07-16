package com.cybersoc.model;

import jakarta.persistence.*;

@Entity
@Table(name = "resolved_incidents", indexes = {
    @Index(name = "idx_resolved_assigned", columnList = "assignedAnalyst"),
    @Index(name = "idx_resolved_reported", columnList = "reportedBy"),
    @Index(name = "idx_resolved_category", columnList = "category"),
    @Index(name = "idx_resolved_priority", columnList = "priority")
})
public class ResolvedIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long incidentId;
    private String title;
    private String category;
    private String priority;
    private String assignedAnalyst;
    private String approvedBy;
    private String resolvedTime;
    
    @Column(columnDefinition = "TEXT")
    private String resolutionSummary;

    private String reportedBy;
    private String timestamp; // created date
    
    @Column(columnDefinition = "TEXT")
    private String aiSummary;

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
    private String recommendedPriority;

    private String aiRecommendationStatus = "Pending";

    @Column(columnDefinition = "TEXT")
    private String aiRejectionReason;

    @Column(columnDefinition = "TEXT")
    private String checklistState;

    private String createdTime;
    private String slaStatus;
    private String workflow;
    private String assignedTime;
    private String escalationTime;
    private String approvalTime;
    private String closedTime;

    public ResolvedIncident() {
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

    public String getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(String approvedBy) {
        this.approvedBy = approvedBy;
    }

    public String getResolvedTime() {
        return resolvedTime;
    }

    public void setResolvedTime(String resolvedTime) {
        this.resolvedTime = resolvedTime;
    }

    public String getResolutionSummary() {
        return resolutionSummary;
    }

    public void setResolutionSummary(String resolutionSummary) {
        this.resolutionSummary = resolutionSummary;
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

    public String getAiSummary() {
        return aiSummary;
    }

    public void setAiSummary(String aiSummary) {
        this.aiSummary = aiSummary;
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

    public String getSlaStatus() {
        return slaStatus;
    }

    public void setSlaStatus(String slaStatus) {
        this.slaStatus = slaStatus;
    }

    public String getWorkflow() {
        return workflow;
    }

    public void setWorkflow(String workflow) {
        this.workflow = workflow;
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

    public String getRecommendedPriority() {
        return recommendedPriority;
    }

    public void setRecommendedPriority(String recommendedPriority) {
        this.recommendedPriority = recommendedPriority;
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
}
