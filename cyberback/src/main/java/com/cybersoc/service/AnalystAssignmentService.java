package com.cybersoc.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import com.cybersoc.model.User;
import com.cybersoc.model.Incident;
import com.cybersoc.model.AssignmentHistory;
import com.cybersoc.model.EscalationHistory;
import com.cybersoc.model.Notification;
import com.cybersoc.repository.UserRepository;
import com.cybersoc.repository.IncidentRepository;
import com.cybersoc.repository.AssignmentHistoryRepository;
import com.cybersoc.repository.EscalationHistoryRepository;
import com.cybersoc.repository.ResolvedIncidentRepository;

@Service
public class AnalystAssignmentService {

    private final UserRepository userRepository;
    private final IncidentRepository incidentRepository;
    private final ResolvedIncidentRepository resolvedIncidentRepository;
    private final AssignmentHistoryRepository assignmentHistoryRepository;
    private final EscalationHistoryRepository escalationHistoryRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final EmailService emailService;

    public AnalystAssignmentService(UserRepository userRepository,
                                    IncidentRepository incidentRepository,
                                    ResolvedIncidentRepository resolvedIncidentRepository,
                                    AssignmentHistoryRepository assignmentHistoryRepository,
                                    EscalationHistoryRepository escalationHistoryRepository,
                                    NotificationService notificationService,
                                    AuditService auditService,
                                    EmailService emailService) {
        this.userRepository = userRepository;
        this.incidentRepository = incidentRepository;
        this.resolvedIncidentRepository = resolvedIncidentRepository;
        this.assignmentHistoryRepository = assignmentHistoryRepository;
        this.escalationHistoryRepository = escalationHistoryRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.emailService = emailService;
    }

    public User assignL1(String category) {
        return findLeastBusyAnalyst(category, "L1");
    }

    public User assignL2(String category) {
        return findLeastBusyAnalyst(category, "L2");
    }

    public User assignL3(String category) {
        return findLeastBusyAnalyst(category, "L3");
    }

    private int calculateRoutingConfidence(Incident incident, User analyst) {
        int confidence = 75; // Base confidence

        // Severity contribution
        String priority = incident.getPriority();
        if ("CRITICAL".equalsIgnoreCase(priority)) {
            confidence -= 15;
        } else if ("HIGH".equalsIgnoreCase(priority)) {
            confidence -= 5;
        } else {
            confidence += 5;
        }

        // Category contribution
        String category = incident.getCategory() != null ? incident.getCategory().toUpperCase() : "";
        if (category.equals("PHISHING") || category.equals("MALWARE") || category.contains("EMAIL")) {
            confidence += 10;
        } else {
            confidence -= 5;
        }

        if (analyst != null) {
            // Similar historical incidents contribution
            long similarResolved = resolvedIncidentRepository.findAll().stream()
                    .filter(r -> analyst.getUsername().equalsIgnoreCase(r.getAssignedAnalyst()) && incident.getCategory().equalsIgnoreCase(r.getCategory()))
                    .count();
            if (similarResolved > 10) {
                confidence += 15;
            } else if (similarResolved > 5) {
                confidence += 10;
            } else if (similarResolved > 2) {
                confidence += 5;
            } else if (similarResolved == 0) {
                confidence -= 10;
            }

            // Workload contribution
            long activeWorkload = incidentRepository.countActiveWorkload(analyst.getUsername());
            if (activeWorkload <= 1) {
                confidence += 10;
            } else if (activeWorkload > 3) {
                confidence -= 10;
            }

            // Performance contribution
            double performanceScore = analyst.getPerformanceScore() != null ? analyst.getPerformanceScore() : 0.0;
            if (performanceScore >= 85.0) {
                confidence += 10;
            } else if (performanceScore < 50.0) {
                confidence -= 10;
            }
        } else {
            confidence -= 20; // No analyst recommended
        }

        return Math.max(0, Math.min(100, confidence));
    }

    public Incident autoAssignOnReport(Incident incident) {
        // Determine routing confidence using L1 candidate
        User recommendedL1 = assignL1(incident.getCategory());
        int confidence = calculateRoutingConfidence(incident, recommendedL1);
        incident.setRoutingConfidence(confidence);

        if (confidence > 80) {
            // Assign L1 Analyst
            if (recommendedL1 != null) {
                String reasonText = "Incident assigned to " + recommendedL1.getFullName() + " because AI confidence is high (" + confidence + "%). Selection is based on specialization match, low workload, and high resolution success rate.";
                assignToAnalyst(incident, recommendedL1, "L1", "Unassigned", "System", "Automatic", reasonText);
                return incident;
            }
            // Fallback to L2
            User l2Analyst = assignL2(incident.getCategory());
            if (l2Analyst != null) {
                String reasonText = "L1 analyst was unavailable. Incident assigned to " + l2Analyst.getFullName() + " with high AI confidence (" + confidence + "%).";
                assignToAnalyst(incident, l2Analyst, "L2", "Unassigned", "System", "Automatic Escalation", reasonText);
                return incident;
            }
        } else if (confidence >= 50 && confidence <= 80) {
            // Assign L2 Analyst
            User l2Analyst = assignL2(incident.getCategory());
            if (l2Analyst != null) {
                String reasonText = "Incident assigned to " + l2Analyst.getFullName() + " because AI confidence is moderate (" + confidence + "%), requiring L2 tier response.";
                assignToAnalyst(incident, l2Analyst, "L2", "Unassigned", "System", "Automatic Escalation", reasonText);
                return incident;
            }
            // Fallback to L3
            User l3Analyst = assignL3(incident.getCategory());
            if (l3Analyst != null) {
                String reasonText = "L2 analyst was unavailable. Incident assigned to L3 " + l3Analyst.getFullName() + " with moderate AI confidence (" + confidence + "%).";
                assignToAnalyst(incident, l3Analyst, "L3", "Unassigned", "System", "Automatic Escalation", reasonText);
                return incident;
            }
        } else {
            // Require Admin Review
            incident.setStatus("PENDING_ASSIGNMENT");
            incident.setAssignedTo(null);
            incident.setAssignedAnalystName(null);
            incident.setUpdatedTime(now());
            incidentRepository.save(incident);

            auditService.log(
                "System",
                "Pending Admin Assignment",
                String.valueOf(incident.getId()),
                incident.getTitle(),
                "None",
                "PENDING_ASSIGNMENT",
                "127.0.0.1",
                "Incident routed to Admin Review due to low AI confidence (" + confidence + "%)."
            );
            notificationService.send(new Notification("PENDING_ASSIGNMENT", "Incident INC-" + String.format("%06d", incident.getId()) + " requires Admin Review due to low AI confidence (" + confidence + "%).", "admin"));
            return incident;
        }

        // Fallback to Management Review if L1/L2/L3 unavailable
        moveToManagementReview(incident, "Unassigned", "L1", "No matching L1, L2, or L3 analysts available");
        return incident;
    }

    public User getAiRecommendedAnalyst(Incident incident) {
        List<User> activeAnalysts = userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && "ANALYST".equalsIgnoreCase(u.getRole().trim()))
                .filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()))
                .toList();

        if (activeAnalysts.isEmpty()) {
            return null;
        }

        User bestAnalyst = null;
        double maxScore = -1.0;
        long bestWorkload = 999;
        long bestSimilar = 0;

        for (User analyst : activeAnalysts) {
            boolean specMatch = doesSpecializationMatch(incident.getCategory(), analyst.getSpecialization());
            double specScore = specMatch ? 100.0 : 0.0;

            String priority = incident.getPriority();
            String level = analyst.getAnalystLevel() != null ? analyst.getAnalystLevel().toUpperCase() : "L1";
            double levelScore = 50.0;
            if ("CRITICAL".equalsIgnoreCase(priority) || "HIGH".equalsIgnoreCase(priority)) {
                if ("L2".equals(level) || "L3".equals(level)) {
                    levelScore = 100.0;
                }
            } else {
                if ("L1".equals(level)) {
                    levelScore = 100.0;
                } else {
                    levelScore = 70.0;
                }
            }

            long activeWorkload = incidentRepository.countActiveWorkload(analyst.getUsername());
            double workloadScore = Math.max(0.0, 100.0 - (activeWorkload * 10.0));

            long similarResolved = resolvedIncidentRepository.findAll().stream()
                    .filter(r -> analyst.getUsername().equalsIgnoreCase(r.getAssignedAnalyst()) && incident.getCategory().equalsIgnoreCase(r.getCategory()))
                    .count();
            double experienceScore = Math.min(100.0, similarResolved * 10.0);

            double performanceScore = analyst.getPerformanceScore() != null ? analyst.getPerformanceScore() : 0.0;

            double finalScore = (0.40 * specScore) + (0.20 * workloadScore) + (0.20 * performanceScore) + (0.10 * levelScore) + (0.10 * experienceScore);

            boolean isBetter = false;
            if (finalScore > maxScore) {
                isBetter = true;
            } else if (Math.abs(finalScore - maxScore) < 0.0001) {
                if (activeWorkload < bestWorkload) {
                    isBetter = true;
                } else if (activeWorkload == bestWorkload && similarResolved > bestSimilar) {
                    isBetter = true;
                }
            }

            if (isBetter) {
                maxScore = finalScore;
                bestAnalyst = analyst;
                bestWorkload = activeWorkload;
                bestSimilar = similarResolved;
            }
        }
        return bestAnalyst;
    }

    public double calculateAnalystScore(Incident incident, User analyst) {
        if (analyst == null) return 0.0;
        boolean specMatch = doesSpecializationMatch(incident.getCategory(), analyst.getSpecialization());
        double specScore = specMatch ? 100.0 : 0.0;

        String priority = incident.getPriority();
        String level = analyst.getAnalystLevel() != null ? analyst.getAnalystLevel().toUpperCase() : "L1";
        double levelScore = 50.0;
        if ("CRITICAL".equalsIgnoreCase(priority) || "HIGH".equalsIgnoreCase(priority)) {
            if ("L2".equals(level) || "L3".equals(level)) {
                levelScore = 100.0;
            }
        } else {
            if ("L1".equals(level)) {
                levelScore = 100.0;
            } else {
                levelScore = 70.0;
            }
        }

        long activeWorkload = incidentRepository.countActiveWorkload(analyst.getUsername());
        double workloadScore = Math.max(0.0, 100.0 - (activeWorkload * 10.0));

        long similarResolved = resolvedIncidentRepository.findAll().stream()
                .filter(r -> analyst.getUsername().equalsIgnoreCase(r.getAssignedAnalyst()) && incident.getCategory().equalsIgnoreCase(r.getCategory()))
                .count();
        double experienceScore = Math.min(100.0, similarResolved * 10.0);

        double performanceScore = analyst.getPerformanceScore() != null ? analyst.getPerformanceScore() : 0.0;

        return (0.40 * specScore) + (0.20 * workloadScore) + (0.20 * performanceScore) + (0.10 * levelScore) + (0.10 * experienceScore);
    }

    public Incident autoAssignWithAi(Incident incident) {
        User recommended = getAiRecommendedAnalyst(incident);
        double aiMatchScore = calculateAnalystScore(incident, recommended);
        int confidence = (int) Math.round(aiMatchScore);
        incident.setRoutingConfidence(confidence);
        incident.setAiAssistantConfidenceScore(String.valueOf(confidence));

        boolean isCritical = "CRITICAL".equalsIgnoreCase(incident.getPriority());
        boolean hasL2L3Validation = false;
        if (recommended != null) {
            String level = recommended.getAnalystLevel() != null ? recommended.getAnalystLevel().toUpperCase() : "L1";
            if ("L2".equals(level) || "L3".equals(level)) {
                hasL2L3Validation = true;
            }
        }

        // Auto assignment criteria: Match Score >= 80%, analyst present, and Critical priority requires L2/L3 analyst
        boolean canAutoAssign = (aiMatchScore >= 80.0) && (recommended != null) && (!isCritical || hasL2L3Validation);

        if (canAutoAssign) {
            String reasonText = "Automatically assigned because AI confidence score exceeded 80% threshold.";
            
            // Assign to analyst
            assignToAnalyst(incident, recommended, recommended.getAnalystLevel() != null ? recommended.getAnalystLevel() : "L1", 
                            "Unassigned", "AI System", "Automatic AI Assignment", reasonText);
            
            incident.setStatus("UNDER_INVESTIGATION");
            incident.setUpdatedTime(now());
            Incident saved = incidentRepository.save(incident);
            
            // Log automatic assignment in audit logs
            auditService.log(
                "AI System",
                "AI AUTOMATIC ASSIGNMENT",
                String.valueOf(saved.getId()),
                saved.getTitle(),
                "Unassigned",
                recommended.getUsername(),
                "127.0.0.1",
                "Automatically assigned because AI confidence score exceeded 80% threshold. Recommended: " + recommended.getFullName() + " (Score: " + confidence + "%)."
            );
            return saved;
        } else {
            // Keep incident unassigned and move to Admin Assignment Review Queue
            incident.setStatus("PENDING_ASSIGNMENT");
            incident.setAssignedTo(null);
            incident.setAssignedAnalystName(null);
            incident.setUpdatedTime(now());
            
            String failReason = "AI confidence below 80% threshold.";
            if (isCritical && !hasL2L3Validation && recommended != null) {
                failReason = "Critical incident requires L2/L3 analyst validation.";
            } else if (recommended == null) {
                failReason = "No active analysts available in SOC roster.";
            }
            
            incident.setAnalystNotes("AI Recommendation: " + (recommended != null ? recommended.getFullName() : "None") + " (" + confidence + "%). Result: Pending Admin Review. Reason: " + failReason);
            
            Incident saved = incidentRepository.save(incident);
            
            auditService.log(
                "AI System",
                "PENDING ASSIGNMENT - LOW CONFIDENCE",
                String.valueOf(saved.getId()),
                saved.getTitle(),
                "Unassigned",
                "None",
                "127.0.0.1",
                "Incident routed to Admin Review: " + failReason + " (Score: " + confidence + "%)."
            );
            
            // Notify Admin that manual assignment is required due to low AI confidence
            notificationService.send(new Notification(
                "PENDING_ASSIGNMENT", 
                "Incident INC-" + String.format("%06d", saved.getId()) + " requires Admin Review: " + failReason + " (Score: " + confidence + "%).", 
                "admin"
            ));
            
            return saved;
        }
    }

    public void escalateIncident(Incident incident, String triggerType, String reasonText) {
        String oldAnalyst = incident.getAssignedTo() != null ? incident.getAssignedTo() : "Unassigned";
        String oldLevel = incident.getEscalationLevel() != null ? incident.getEscalationLevel() : "L1";

        if (!"Unassigned".equals(oldAnalyst) && oldAnalyst != null) {
            User oldAnalystUser = userRepository.findByUsername(oldAnalyst).orElse(null);
            if (oldAnalystUser != null) {
                int escCount = oldAnalystUser.getEscalatedIncidents() != null ? oldAnalystUser.getEscalatedIncidents() + 1 : 1;
                oldAnalystUser.setEscalatedIncidents(escCount);
                userRepository.save(oldAnalystUser);
                syncAnalystStats(oldAnalystUser);
            }
        }

        if ("L3".equalsIgnoreCase(oldLevel)) {
            if ("System".equalsIgnoreCase(triggerType)) {
                auditService.log(
                    "System",
                    "SLA Breached",
                    String.valueOf(incident.getId()),
                    incident.getTitle(),
                    oldLevel,
                    "Management",
                    "127.0.0.1",
                    "Automatically escalated to Management Review"
                );
            }
            moveToManagementReview(incident, oldAnalyst, oldLevel, reasonText);
            return;
        }

        if ("L1".equalsIgnoreCase(oldLevel)) {
            if ("System".equalsIgnoreCase(triggerType)) {
                auditService.log(
                    "System",
                    "SLA Breached",
                    String.valueOf(incident.getId()),
                    incident.getTitle(),
                    "L1",
                    "L2",
                    "127.0.0.1",
                    "Automatically escalated to L2 Analyst"
                );
            }

            // Try L2
            User l2Analyst = assignL2(incident.getCategory());
            if (l2Analyst != null) {
                String workloadReason = "Incident assigned to " + l2Analyst.getFullName() + " because she achieved the highest Assignment Score based on Specialization Match, Current Workload, and Historical Resolution Performance.";
                assignToAnalyst(incident, l2Analyst, "L2", oldAnalyst, triggerType, "System".equalsIgnoreCase(triggerType) ? "Automatic Escalation" : "Manual Escalation", workloadReason);
                return;
            } else {
                auditService.log(
                    "System",
                    "Escalation Failed",
                    String.valueOf(incident.getId()),
                    incident.getTitle(),
                    "L2 Analyst",
                    "No matching active L2 analyst found for category " + incident.getCategory(),
                    "127.0.0.1",
                    "L2 escalation failed: no matching active L2 analyst found for category " + incident.getCategory()
                );

                // Try L3
                User l3Analyst = assignL3(incident.getCategory());
                if (l3Analyst != null) {
                    String workloadReason = "Incident assigned to " + l3Analyst.getFullName() + " because she achieved the highest Assignment Score based on Specialization Match, Current Workload, and Historical Resolution Performance.";
                    assignToAnalyst(incident, l3Analyst, "L3", oldAnalyst, triggerType, "System".equalsIgnoreCase(triggerType) ? "Automatic Escalation" : "Manual Escalation", workloadReason);
                    return;
                } else {
                    auditService.log(
                        "System",
                        "Escalation Failed",
                        String.valueOf(incident.getId()),
                        incident.getTitle(),
                        "L3 Analyst",
                        "No matching active L3 analyst found for category " + incident.getCategory(),
                        "127.0.0.1",
                        "L3 escalation failed: no matching active L3 analyst found for category " + incident.getCategory()
                    );
                    moveToManagementReview(incident, oldAnalyst, oldLevel, "L2 and L3 unavailable. " + reasonText);
                }
            }
        } else if ("L2".equalsIgnoreCase(oldLevel)) {
            if ("System".equalsIgnoreCase(triggerType)) {
                auditService.log(
                    "System",
                    "SLA Breached",
                    String.valueOf(incident.getId()),
                    incident.getTitle(),
                    "L2",
                    "L3",
                    "127.0.0.1",
                    "Automatically escalated to L3 Analyst"
                );
            }

            // Try L3
            User l3Analyst = assignL3(incident.getCategory());
            if (l3Analyst != null) {
                String workloadReason = "Incident assigned to " + l3Analyst.getFullName() + " because she achieved the highest Assignment Score based on Specialization Match, Current Workload, and Historical Resolution Performance.";
                assignToAnalyst(incident, l3Analyst, "L3", oldAnalyst, triggerType, "System".equalsIgnoreCase(triggerType) ? "Automatic Escalation" : "Manual Escalation", workloadReason);
                return;
            } else {
                auditService.log(
                    "System",
                    "Escalation Failed",
                    String.valueOf(incident.getId()),
                    incident.getTitle(),
                    "L3 Analyst",
                    "No matching active L3 analyst found for category " + incident.getCategory(),
                    "127.0.0.1",
                    "L3 escalation failed: no matching active L3 analyst found for category " + incident.getCategory()
                );
                moveToManagementReview(incident, oldAnalyst, oldLevel, "L3 unavailable. " + reasonText);
            }
        }
    }

    private void assignToAnalyst(Incident incident, User analyst, String level, String oldAnalyst, String assignedBy, String type, String reason) {
        String username = analyst.getUsername();
        if (username != null) {
            username = username.trim();
            if (username.contains(" ")) {
                username = username.split(" ")[0];
            }
        }
        String fullName = analyst.getFullName();
        
        long activeIncidents = incidentRepository.countActiveWorkload(analyst.getUsername());
        long resolvedCount = resolvedIncidentRepository.countByAssignedAnalyst(analyst.getUsername());
        int escalatedVal = analyst.getEscalatedIncidents() != null ? analyst.getEscalatedIncidents() : 0;
        int reopenedVal = analyst.getReopenedIncidents() != null ? analyst.getReopenedIncidents() : 0;
        
        int totalAss = (int) (activeIncidents + resolvedCount + escalatedVal + reopenedVal);
        double perfScore = totalAss > 0 ? (resolvedCount * 100.0 / totalAss) : 0.0;
        
        double specScore = doesSpecializationMatch(incident.getCategory(), analyst.getSpecialization()) ? 100.0 : 0.0;
        double workloadScore = Math.max(0.0, 100.0 - (activeIncidents * 10.0));
        double assignmentScore = (0.40 * specScore) + (0.30 * workloadScore) + (0.30 * perfScore);

        incident.setAssignmentSpecScore(specScore);
        incident.setAssignmentWorkloadScore(workloadScore);
        incident.setAssignmentPerfScore(perfScore);
        incident.setAssignmentFinalScore(assignmentScore);
        incident.setAssignmentReason(fullName + " achieved the highest Assignment Score among all eligible analysts.");

        incident.setAssignedTo(username);
        incident.setAssignedAnalystName(fullName);
        incident.setEscalationLevel(level);
        incident.setAssignedTime(now());
        
        if ("L1".equalsIgnoreCase(level)) {
            incident.setStatus("UNDER_INVESTIGATION");
        } else {
            incident.setStatus("ESCALATED");
        }
        
        incident.setUpdatedTime(now());
        incident.setSlaDeadline(calculateSlaDeadline(incident.getPriority()));
        incidentRepository.save(incident);

        analyst.setLastAssignmentTime(now());
        syncAnalystStats(analyst);
        if (oldAnalyst != null && !"Unassigned".equals(oldAnalyst)) {
            User oldUser = userRepository.findByUsername(oldAnalyst).orElse(null);
            if (oldUser != null) {
                syncAnalystStats(oldUser);
            }
        }

        String actionHeader = "Incident automatically assigned to " + fullName + ".";
        if (type != null) {
            if (type.contains("Manual") || type.contains("Override")) {
                actionHeader = "Incident manually assigned to " + fullName + ".";
            } else if (type.contains("Escalation")) {
                actionHeader = "Incident escalated to " + fullName + ".";
            }
        }
        
        String decisionExplanation = fullName + " achieved the highest Assignment Score among all eligible analysts.";
        if (type != null) {
            if (type.contains("Manual") || type.contains("Override")) {
                decisionExplanation = "Manual assignment override performed by Administrator.";
            } else if (type.contains("Escalation")) {
                decisionExplanation = "Incident escalated based on workload and tier level escalation parameters.";
            }
        }

        String detailedReason = actionHeader + "\n"
            + "Assignment Decision\n"
            + "Specialization Match : " + String.format("%.0f", specScore) + "\n"
            + "Workload Score : " + String.format("%.0f", workloadScore) + "\n"
            + "Performance Score : " + String.format("%.1f", perfScore) + "\n"
            + "Final Assignment Score : " + String.format("%.2f", assignmentScore) + "\n"
            + "Reason\n"
            + decisionExplanation;

        // Save Assignment History
        AssignmentHistory ah = new AssignmentHistory();
        ah.setIncidentId(incident.getId());
        ah.setAssignedBy(assignedBy);
        ah.setAssignedTo(username);
        ah.setAssignedToName(fullName + " (" + level + " Analyst)");
        ah.setIncidentCategory(incident.getCategory());
        ah.setAnalystSpecialization(analyst.getSpecialization());
        ah.setOverride(false);
        ah.setAssignmentType(type);
        ah.setReason(detailedReason);
        ah.setAssignmentTime(now());
        assignmentHistoryRepository.save(ah);

        // Log Timeline: Incident Assigned
        auditService.log(
            assignedBy,
            "Incident Assigned",
            String.valueOf(incident.getId()),
            incident.getTitle(),
            oldAnalyst,
            username,
            "127.0.0.1",
            detailedReason
        );

        // Notify new analyst
        if ("L3".equalsIgnoreCase(level)) {
            notificationService.send(new Notification("ASSIGNED", "Incident automatically escalated to you.", username));
        } else {
            notificationService.send(new Notification("ASSIGNED", "You have been assigned Incident INC-" + String.format("%06d", incident.getId()) + ".", username));
        }

        // Notify Admin
        if ("L2".equalsIgnoreCase(level)) {
            notificationService.send(new Notification("ESCALATED", "Incident escalated to L2.", "admin"));
        } else if ("L3".equalsIgnoreCase(level)) {
            notificationService.send(new Notification("ESCALATED", "Incident escalated to L3.", "admin"));
        }

        // Notify employee
        if (incident.getReportedBy() != null) {
            notificationService.send(new Notification(
                "ASSIGNED",
                "Analyst " + fullName + " has been assigned to investigate your incident INC-" + String.format("%06d", incident.getId()),
                incident.getReportedBy()
            ));
        }
    }

    private void moveToManagementReview(Incident incident, String oldAnalyst, String oldLevel, String reason) {
        incident.setStatus("MANAGEMENT_REVIEW");
        
        // Preserve assigned analyst info if it is already present
        if (incident.getAssignedTo() == null || "Management Review".equalsIgnoreCase(incident.getAssignedTo()) || "Unassigned".equalsIgnoreCase(incident.getAssignedTo())) {
            if (oldAnalyst != null && !"Management Review".equalsIgnoreCase(oldAnalyst) && !"Unassigned".equalsIgnoreCase(oldAnalyst)) {
                incident.setAssignedTo(oldAnalyst);
                User u = userRepository.findByUsername(oldAnalyst).orElse(null);
                if (u != null) {
                    incident.setAssignedAnalystName(u.getFullName());
                }
            } else {
                incident.setAssignedTo(null);
                incident.setAssignedAnalystName(null);
            }
        }
        
        incident.setEscalationTime(now());
        incident.setUpdatedTime(now());
        incidentRepository.save(incident);

        // Save Assignment History
        AssignmentHistory ah = new AssignmentHistory();
        ah.setIncidentId(incident.getId());
        ah.setAssignedBy("System");
        ah.setAssignedTo(incident.getAssignedTo() != null ? incident.getAssignedTo() : "Management Review");
        ah.setAssignedToName(incident.getAssignedAnalystName() != null ? incident.getAssignedAnalystName() : "Management Review");
        ah.setIncidentCategory(incident.getCategory());
        ah.setAnalystSpecialization("N/A");
        ah.setOverride(false);
        ah.setAssignmentType("Automatic Escalation");
        ah.setReason(reason);
        ah.setAssignmentTime(now());
        assignmentHistoryRepository.save(ah);

        // Record Escalation History
        EscalationHistory eh = new EscalationHistory();
        eh.setIncidentId(incident.getId());
        eh.setOldAnalyst(oldAnalyst);
        eh.setNewAnalyst(incident.getAssignedTo() != null ? incident.getAssignedTo() : "Management Review");
        eh.setOldLevel(oldLevel);
        eh.setNewLevel("Management");
        eh.setReason(reason);
        eh.setEscalatedTime(now());
        eh.setTriggeredBy("System");
        escalationHistoryRepository.save(eh);

        // Log Timeline: Management Review Initiated
        auditService.log(
            "System",
            "Management Review Initiated",
            String.valueOf(incident.getId()),
            incident.getTitle(),
            oldAnalyst,
            "Management Review",
            "127.0.0.1",
            "No further analyst levels available."
        );

        // Notify employee
        if (incident.getReportedBy() != null) {
            notificationService.send(new Notification(
                "ESCALATED",
                "Your incident INC-" + String.format("%06d", incident.getId()) + " has been escalated and is under Management Review.",
                incident.getReportedBy()
            ));
        }

        // Notify admins
        notificationService.send(new Notification("MANAGEMENT_REVIEW", "Incident moved to Management Review.", "admin"));
    }

    private User findLeastBusyAnalyst(String category, String level) {
        List<User> allAnalysts = userRepository.findAll().stream()
            .filter(u -> u.getRole() != null && "ANALYST".equalsIgnoreCase(u.getRole().trim()))
            .toList();

        List<User> eligibleAnalysts = new java.util.ArrayList<>();
        for (User analyst : allAnalysts) {
            if (!"ACTIVE".equalsIgnoreCase(analyst.getStatus())) {
                continue;
            }

            if (level != null && !level.equalsIgnoreCase(analyst.getAnalystLevel())) {
                continue;
            }

            if (category != null && analyst.getSpecialization() != null &&
                doesSpecializationMatch(category, analyst.getSpecialization())) {
                eligibleAnalysts.add(analyst);
            }
        }

        if (eligibleAnalysts.isEmpty()) {
            System.out.println("Eligible Analysts:\nNo eligible analysts found.");
            return null;
        }

        if (eligibleAnalysts.size() == 1) {
            User singleAnalyst = eligibleAnalysts.get(0);
            System.out.println("Eligible Analysts:");
            System.out.println("Only one eligible analyst found.");
            System.out.println("Selected Analyst:\n" + singleAnalyst.getFullName() + " (Lowest Workload)");
            return singleAnalyst;
        }

        System.out.println("Eligible Analysts:");
        User selected = null;
        double maxAssignmentScore = -1.0;
        String selectedLastAssignmentTime = null;

        for (User analyst : eligibleAnalysts) {
            long activeIncidents = incidentRepository.countActiveWorkload(analyst.getUsername());
            long resolvedCount = resolvedIncidentRepository.countByAssignedAnalyst(analyst.getUsername());
            int escalatedVal = analyst.getEscalatedIncidents() != null ? analyst.getEscalatedIncidents() : 0;
            int reopenedVal = analyst.getReopenedIncidents() != null ? analyst.getReopenedIncidents() : 0;
            
            int totalAssigned = (int) (activeIncidents + resolvedCount + escalatedVal + reopenedVal);
            double perfScore = totalAssigned > 0 ? (resolvedCount * 100.0 / totalAssigned) : 0.0;
            
            double specScore = doesSpecializationMatch(category, analyst.getSpecialization()) ? 100.0 : 0.0;
            double workloadScore = Math.max(0.0, 100.0 - (activeIncidents * 10.0));
            
            double assignmentScore = (0.40 * specScore) + (0.30 * workloadScore) + (0.30 * perfScore);
            
            double compSpec = 0.40 * specScore;
            double compWorkload = 0.30 * workloadScore;
            double compPerf = 0.30 * perfScore;
            
            System.out.println("Candidate: " + analyst.getFullName());
            System.out.println("Specialization = " + String.format("%.1f", specScore));
            System.out.println("Workload = " + String.format("%.1f", workloadScore));
            System.out.println("Performance = " + String.format("%.1f", perfScore));
            System.out.println("Assignment Score = " + String.format("%.1f", compSpec) + " + " 
                + String.format("%.1f", compWorkload) + " + " 
                + String.format("%.1f", compPerf) + " = " 
                + String.format("%.2f", assignmentScore));
            System.out.println("----------------------------------------");

            if (assignmentScore > maxAssignmentScore) {
                maxAssignmentScore = assignmentScore;
                selected = analyst;
                selectedLastAssignmentTime = analyst.getLastAssignmentTime();
            } else if (Math.abs(assignmentScore - maxAssignmentScore) < 0.0001) {
                String timeCurr = analyst.getLastAssignmentTime() != null ? analyst.getLastAssignmentTime() : "1970-01-01 00:00:00";
                String timeSelected = selectedLastAssignmentTime != null ? selectedLastAssignmentTime : "1970-01-01 00:00:00";
                if (timeCurr.compareTo(timeSelected) < 0) {
                    selected = analyst;
                    selectedLastAssignmentTime = analyst.getLastAssignmentTime();
                }
            }
        }

        if (selected != null) {
            System.out.println("\nSelected Analyst:");
            System.out.println(selected.getFullName() + " (Highest Assignment Score: " + String.format("%.2f", maxAssignmentScore) + ")");
        }

        return selected;
    }

    public static boolean doesSpecializationMatch(String category, String specialization) {
        if (category == null || specialization == null) {
            return false;
        }
        String cat = category.toUpperCase().trim();
        String spec = specialization.toUpperCase().trim();

        if (cat.equals(spec)) {
            return true;
        }

        switch (cat) {
            case "MALWARE":
                return "MALWARE".equals(spec);
            case "PHISHING":
                return "PHISHING".equals(spec);
            case "RANSOMWARE":
                return "RANSOMWARE".equals(spec);
            case "WEB_SECURITY":
            case "WEB_ATTACK":
                return "WEB SECURITY".equals(spec) || "WEB ATTACK".equals(spec);
            case "DATA_BREACH":
                return "DATA SECURITY".equals(spec) || "DATA BREACH".equals(spec);
            case "NETWORK":
            case "NETWORK_SECURITY":
                return "NETWORK SECURITY".equals(spec) || "NETWORK".equals(spec);
            case "EMAIL_SECURITY":
                return "EMAIL SECURITY".equals(spec);
            case "IDENTITY_ACCESS":
                return "IDENTITY & ACCESS".equals(spec) || "IDENTITY AND ACCESS".equals(spec) || "IDENTITY_ACCESS".equals(spec);
            case "ENDPOINT_SECURITY":
                return "ENDPOINT SECURITY".equals(spec);
            default:
                return cat.equalsIgnoreCase(spec);
        }
    }

    public void syncAnalystStats(User analyst) {
        if (analyst == null) return;
        long active = incidentRepository.countActiveWorkload(analyst.getUsername());
        long closed = resolvedIncidentRepository.countByAssignedAnalyst(analyst.getUsername());
        
        int escalated = analyst.getEscalatedIncidents() != null ? analyst.getEscalatedIncidents() : 0;
        int reopened = analyst.getReopenedIncidents() != null ? analyst.getReopenedIncidents() : 0;
        
        int totalAssigned = (int) (active + closed + escalated + reopened);
        double score = totalAssigned > 0 ? (closed * 100.0 / totalAssigned) : 0.0;
        
        analyst.setResolvedIncidents((int) closed);
        analyst.setTotalAssignedIncidents(totalAssigned);
        analyst.setPerformanceScore(score);
        userRepository.save(analyst);
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
        return now.plusHours(8).toString();
    }

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}