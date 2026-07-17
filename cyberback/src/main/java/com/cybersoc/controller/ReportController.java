package com.cybersoc.controller;

import com.cybersoc.model.ReportHistory;
import com.cybersoc.model.Incident;
import com.cybersoc.model.ResolvedIncident;
import com.cybersoc.model.User;
import com.cybersoc.repository.ReportHistoryRepository;
import com.cybersoc.repository.IncidentRepository;
import com.cybersoc.repository.ResolvedIncidentRepository;
import com.cybersoc.repository.UserRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportHistoryRepository reportHistoryRepository;
    private final IncidentRepository incidentRepository;
    private final ResolvedIncidentRepository resolvedIncidentRepository;
    private final UserRepository userRepository;

    public ReportController(ReportHistoryRepository reportHistoryRepository,
                            IncidentRepository incidentRepository,
                            ResolvedIncidentRepository resolvedIncidentRepository,
                            UserRepository userRepository) {
        this.reportHistoryRepository = reportHistoryRepository;
        this.incidentRepository = incidentRepository;
        this.resolvedIncidentRepository = resolvedIncidentRepository;
        this.userRepository = userRepository;
    }

    // ================= GET STATISTICS =================
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics(
            @RequestParam(required = false) String timeRange,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String reportedBy,
            @RequestParam(required = false) String assignedTo) {
        
        List<Incident> allActiveRaw = filterUniqueIncidents(incidentRepository.findAll());
        List<ResolvedIncident> allResolvedRaw = new java.util.ArrayList<>(resolvedIncidentRepository.findAll());
        
        List<Incident> activeResolved = allActiveRaw.stream()
                .filter(i -> "RESOLVED".equalsIgnoreCase(i.getStatus()) || 
                             "PENDING_APPROVAL".equalsIgnoreCase(i.getStatus()) || 
                             "PENDING_ADMIN_APPROVAL".equalsIgnoreCase(i.getStatus()) ||
                             "CLOSED".equalsIgnoreCase(i.getStatus()))
                .toList();
                
        for (Incident inc : activeResolved) {
            ResolvedIncident r = convertToResolvedIncident(inc);
            if (r != null) {
                allResolvedRaw.add(r);
            }
        }
        allResolvedRaw = filterUniqueResolvedIncidents(allResolvedRaw);

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;
        String userRole = "ADMIN";
        String userSpec = "";

        if (currentUsername != null) {
            java.util.Optional<User> uOpt = userRepository.findByUsername(currentUsername);
            if (uOpt.isPresent()) {
                User u = uOpt.get();
                userRole = u.getRole() != null ? u.getRole().toUpperCase() : "ADMIN";
                userSpec = u.getSpecialization();
            }
        }

        final String finalRole = userRole;
        final String finalUser = currentUsername;

        List<Incident> activeIncidents = allActiveRaw.stream().filter(inc -> {
            if ("ANALYST".equals(finalRole)) {
                return finalUser != null && finalUser.equalsIgnoreCase(inc.getAssignedTo());
            } else if ("EMPLOYEE".equals(finalRole)) {
                return finalUser != null && finalUser.equalsIgnoreCase(inc.getReportedBy());
            }
            if ("ADMIN".equals(finalRole)) {
                if (assignedTo != null && !assignedTo.trim().isEmpty()) {
                    return assignedTo.equalsIgnoreCase(inc.getAssignedTo());
                }
                if (reportedBy != null && !reportedBy.trim().isEmpty()) {
                    return reportedBy.equalsIgnoreCase(inc.getReportedBy());
                }
            }
            return true;
        }).toList();

        List<ResolvedIncident> resolvedIncidents = allResolvedRaw.stream().filter(inc -> {
            if ("ANALYST".equals(finalRole)) {
                return finalUser != null && finalUser.equalsIgnoreCase(inc.getAssignedAnalyst());
            } else if ("EMPLOYEE".equals(finalRole)) {
                return finalUser != null && finalUser.equalsIgnoreCase(inc.getReportedBy());
            }
            if ("ADMIN".equals(finalRole)) {
                if (assignedTo != null && !assignedTo.trim().isEmpty()) {
                    return assignedTo.equalsIgnoreCase(inc.getAssignedAnalyst());
                }
                if (reportedBy != null && !reportedBy.trim().isEmpty()) {
                    return reportedBy.equalsIgnoreCase(inc.getReportedBy());
                }
            }
            return true;
        }).toList();

        if (timeRange != null || (startDate != null && endDate != null)) {
            LocalDateTime start = null;
            LocalDateTime end = LocalDateTime.now();

            if ("Today".equalsIgnoreCase(timeRange)) {
                start = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
            } else if ("Week".equalsIgnoreCase(timeRange)) {
                start = LocalDateTime.now().minusDays(7);
            } else if ("Month".equalsIgnoreCase(timeRange)) {
                start = LocalDateTime.now().minusDays(30);
            } else if (startDate != null && endDate != null) {
                try {
                    if (startDate.contains("T")) {
                        start = LocalDateTime.parse(startDate);
                        end = LocalDateTime.parse(endDate);
                    } else {
                        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
                        start = java.time.LocalDate.parse(startDate, formatter).atStartOfDay();
                        end = java.time.LocalDate.parse(endDate, formatter).atTime(23, 59, 59);
                    }
                } catch (Exception e) {
                    System.err.println("Failed to parse custom range: " + e.getMessage());
                }
            }

            if (start != null) {
                LocalDateTime finalStart = start;
                LocalDateTime finalEnd = end;
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

                activeIncidents = activeIncidents.stream().filter(i -> {
                    if (i.getTimestamp() == null) return false;
                    try {
                        LocalDateTime dt = LocalDateTime.parse(i.getTimestamp(), formatter);
                        return !dt.isBefore(finalStart) && !dt.isAfter(finalEnd);
                    } catch (Exception e) {
                        return false;
                    }
                }).toList();

                resolvedIncidents = resolvedIncidents.stream().filter(r -> {
                    if (r.getTimestamp() == null) return false;
                    try {
                        LocalDateTime dt = LocalDateTime.parse(r.getTimestamp(), formatter);
                        return !dt.isBefore(finalStart) && !dt.isAfter(finalEnd);
                    } catch (Exception e) {
                        return false;
                    }
                }).toList();
            }
        }

        List<Incident> realActive = activeIncidents.stream()
                .filter(i -> "OPEN".equalsIgnoreCase(i.getStatus()) || 
                             "UNDER_INVESTIGATION".equalsIgnoreCase(i.getStatus()) || 
                             "ESCALATED".equalsIgnoreCase(i.getStatus()))
                .toList();

        List<Incident> pendingResolved = activeIncidents.stream()
                .filter(i -> "RESOLVED".equalsIgnoreCase(i.getStatus()) || 
                             "PENDING_APPROVAL".equalsIgnoreCase(i.getStatus()) || 
                             "PENDING_ADMIN_APPROVAL".equalsIgnoreCase(i.getStatus()) ||
                             "CLOSED".equalsIgnoreCase(i.getStatus()))
                .toList();

        long totalActive = "ANALYST".equals(finalRole) ? realActive.stream().filter(i -> finalUser.equalsIgnoreCase(i.getAssignedTo())).count() : realActive.size();
        long totalResolved = resolvedIncidents.size();
        long totalIncidents = activeIncidents.size();

        long open = activeIncidents.stream().filter(i -> "OPEN".equalsIgnoreCase(i.getStatus()) || "Open".equalsIgnoreCase(i.getStatus())).count();
        long pendingAssignment = activeIncidents.stream().filter(i -> "PENDING_ASSIGNMENT".equalsIgnoreCase(i.getStatus())).count();
        long investigation = activeIncidents.stream().filter(i -> "UNDER_INVESTIGATION".equalsIgnoreCase(i.getStatus()) || "Under Investigation".equalsIgnoreCase(i.getStatus())).count();
        long pending = pendingResolved.stream().filter(i -> "PENDING_ADMIN_APPROVAL".equalsIgnoreCase(i.getStatus()) || "PENDING_APPROVAL".equalsIgnoreCase(i.getStatus()) || "Pending Approval".equalsIgnoreCase(i.getStatus())).count();
        long reopened = activeIncidents.stream().filter(i -> "REOPENED".equalsIgnoreCase(i.getStatus()) || "Reopened".equalsIgnoreCase(i.getStatus())).count();
        long escalated = activeIncidents.stream().filter(i -> "ESCALATED".equalsIgnoreCase(i.getStatus()) || "Escalated".equalsIgnoreCase(i.getStatus())).count();
        long managementReview = activeIncidents.stream().filter(i -> "MANAGEMENT_REVIEW".equalsIgnoreCase(i.getStatus())).count();

        // Priority breakdown
        Map<String, Long> priorityBreakdown = new HashMap<>();
        priorityBreakdown.put("Critical", 0L);
        priorityBreakdown.put("High", 0L);
        priorityBreakdown.put("Medium", 0L);
        priorityBreakdown.put("Low", 0L);

        // AI Risk Level breakdown
        Map<String, Long> aiRiskLevelBreakdown = new HashMap<>();
        aiRiskLevelBreakdown.put("Critical", 0L);
        aiRiskLevelBreakdown.put("High", 0L);
        aiRiskLevelBreakdown.put("Medium", 0L);
        aiRiskLevelBreakdown.put("Low", 0L);

        // AI Recommended Priority breakdown
        Map<String, Long> aiRecommendedPriorityBreakdown = new HashMap<>();
        aiRecommendedPriorityBreakdown.put("Critical", 0L);
        aiRecommendedPriorityBreakdown.put("High", 0L);
        aiRecommendedPriorityBreakdown.put("Medium", 0L);
        aiRecommendedPriorityBreakdown.put("Low", 0L);

        for (Incident i : realActive) {
            String p = i.getPriority();
            if (p != null) {
                priorityBreakdown.put(p, priorityBreakdown.getOrDefault(p, 0L) + 1);
            }
            String ar = i.getAiAssistantRiskLevel();
            if (ar != null) {
                aiRiskLevelBreakdown.put(ar, aiRiskLevelBreakdown.getOrDefault(ar, 0L) + 1);
            }
            String ap = i.getRecommendedPriority();
            if (ap != null) {
                aiRecommendedPriorityBreakdown.put(ap, aiRecommendedPriorityBreakdown.getOrDefault(ap, 0L) + 1);
            }
        }
        for (Incident i : pendingResolved) {
            String p = i.getPriority();
            if (p != null) {
                priorityBreakdown.put(p, priorityBreakdown.getOrDefault(p, 0L) + 1);
            }
            String ar = i.getAiAssistantRiskLevel();
            if (ar != null) {
                aiRiskLevelBreakdown.put(ar, aiRiskLevelBreakdown.getOrDefault(ar, 0L) + 1);
            }
            String ap = i.getRecommendedPriority();
            if (ap != null) {
                aiRecommendedPriorityBreakdown.put(ap, aiRecommendedPriorityBreakdown.getOrDefault(ap, 0L) + 1);
            }
        }
        for (ResolvedIncident r : resolvedIncidents) {
            String p = r.getPriority();
            if (p != null) {
                priorityBreakdown.put(p, priorityBreakdown.getOrDefault(p, 0L) + 1);
            }
            String ar = r.getAiAssistantRiskLevel();
            if (ar != null) {
                aiRiskLevelBreakdown.put(ar, aiRiskLevelBreakdown.getOrDefault(ar, 0L) + 1);
            }
            String ap = r.getRecommendedPriority();
            if (ap != null) {
                aiRecommendedPriorityBreakdown.put(ap, aiRecommendedPriorityBreakdown.getOrDefault(ap, 0L) + 1);
            }
        }

        // Category breakdown
        Map<String, Long> categoryBreakdown = new HashMap<>();
        for (Incident i : realActive) {
            String cat = i.getCategory() != null ? i.getCategory().toUpperCase().trim() : "OTHER";
            if ("IDENTITY_ACCESS".equals(cat) || "INCIDENT_ACCESS".equals(cat) || "IDENTITY & ACCESS".equals(cat) || "IDENTITY AND ACCESS".equals(cat)) {
                cat = "IDENTITY_ACCESS";
            }
            categoryBreakdown.put(cat, categoryBreakdown.getOrDefault(cat, 0L) + 1);
        }
        for (Incident i : pendingResolved) {
            String cat = i.getCategory() != null ? i.getCategory().toUpperCase().trim() : "OTHER";
            if ("IDENTITY_ACCESS".equals(cat) || "INCIDENT_ACCESS".equals(cat) || "IDENTITY & ACCESS".equals(cat) || "IDENTITY AND ACCESS".equals(cat)) {
                cat = "IDENTITY_ACCESS";
            }
            categoryBreakdown.put(cat, categoryBreakdown.getOrDefault(cat, 0L) + 1);
        }
        for (ResolvedIncident r : resolvedIncidents) {
            String cat = r.getCategory() != null ? r.getCategory().toUpperCase().trim() : "OTHER";
            if ("IDENTITY_ACCESS".equals(cat) || "INCIDENT_ACCESS".equals(cat) || "IDENTITY & ACCESS".equals(cat) || "IDENTITY AND ACCESS".equals(cat)) {
                cat = "IDENTITY_ACCESS";
            }
            categoryBreakdown.put(cat, categoryBreakdown.getOrDefault(cat, 0L) + 1);
        }

        // Analyst performance metrics
        List<Map<String, Object>> analystPerformance = new ArrayList<>();
        List<User> analysts = userRepository.findAll().stream().filter(u -> "ANALYST".equalsIgnoreCase(u.getRole())).toList();
        for (User analyst : analysts) {
            Map<String, Object> perf = new HashMap<>();
            perf.put("username", analyst.getUsername());
            perf.put("fullName", analyst.getFullName());
            perf.put("specialization", analyst.getSpecialization());
            perf.put("level", analyst.getAnalystLevel());
            
            // Recalculate real-time active count and closed count
            long activeWorkload = incidentRepository.countActiveWorkload(analyst.getUsername());
            long resolvedCount = resolvedIncidentRepository.countByAssignedAnalyst(analyst.getUsername());
            
            int escalatedVal = analyst.getEscalatedIncidents() != null ? analyst.getEscalatedIncidents() : 0;
            int reopenedVal = analyst.getReopenedIncidents() != null ? analyst.getReopenedIncidents() : 0;
            
            // Recalculate Total Assigned dynamically: active + closed + escalated + reopened
            int totalAssigned = (int) (activeWorkload + resolvedCount + escalatedVal + reopenedVal);
            
            // Performance Score = Resolution Rate (%)
            double score = totalAssigned > 0 ? (resolvedCount * 100.0 / totalAssigned) : 0.0;
            
            // Keep database user record updated!
            analyst.setResolvedIncidents((int) resolvedCount);
            analyst.setTotalAssignedIncidents(totalAssigned);
            analyst.setPerformanceScore(score);
            userRepository.save(analyst);
            
            // Resolution Rate calculation:
            // if TotalAssigned == 0, Resolution Rate = -1.0 (represents N/A in the UI)
            // otherwise, (resolvedCount / totalAssigned) * 100
            double resolutionRate = totalAssigned > 0 ? (resolvedCount * 100.0 / totalAssigned) : -1.0;
            
            // Performance Status mapping:
            // If totalAssigned == 0 -> No History
            // 90–100 -> Excellent
            // 70–89 -> Good
            // 50–69 -> Average
            // 0-49 -> Needs Improvement
            String statusText = "Needs Improvement";
            if (totalAssigned == 0) {
                statusText = "No History";
            } else {
                if (score >= 90.0) {
                    statusText = "Excellent";
                } else if (score >= 70.0) {
                    statusText = "Good";
                } else if (score >= 50.0) {
                    statusText = "Average";
                }
            }

            perf.put("activeCount", activeWorkload);
            perf.put("resolvedCount", resolvedCount);
            perf.put("totalAssigned", totalAssigned);
            perf.put("escalatedCount", escalatedVal);
            perf.put("reopenedCount", reopenedVal);
            perf.put("performanceScore", score);
            perf.put("normalizedPerformanceScore", score);
            perf.put("resolutionRate", resolutionRate);
            perf.put("performanceStatus", statusText);
            
            analystPerformance.add(perf);
        }

        long incidentsAtL1 = realActive.stream().filter(i -> ("L1".equalsIgnoreCase(i.getEscalationLevel()) || i.getEscalationLevel() == null || i.getEscalationLevel().trim().isEmpty()) && !"PENDING_ASSIGNMENT".equalsIgnoreCase(i.getStatus()) && !"MANAGEMENT_REVIEW".equalsIgnoreCase(i.getStatus())).count();
        long incidentsAtL2 = realActive.stream().filter(i -> "L2".equalsIgnoreCase(i.getEscalationLevel())).count();
        long incidentsAtL3 = realActive.stream().filter(i -> "L3".equalsIgnoreCase(i.getEscalationLevel())).count();
        long criticalCount = priorityBreakdown.getOrDefault("Critical", 0L);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalIncidents", totalIncidents);
        stats.put("activeIncidents", totalActive);
        stats.put("resolvedIncidents", totalResolved);
        stats.put("openIncidents", open);
        stats.put("pendingAssignment", pendingAssignment);
        stats.put("underInvestigation", investigation);
        stats.put("pendingApproval", pending);
        stats.put("reopened", reopened);
        stats.put("escalated", escalated);
        stats.put("managementReview", managementReview);
        stats.put("incidentsAtL1", incidentsAtL1);
        stats.put("incidentsAtL2", incidentsAtL2);
        stats.put("incidentsAtL3", incidentsAtL3);
        stats.put("criticalCount", criticalCount);
        stats.put("priorityBreakdown", priorityBreakdown);
        stats.put("categoryBreakdown", categoryBreakdown);
        stats.put("analystPerformance", analystPerformance);
        stats.put("aiRiskLevelBreakdown", aiRiskLevelBreakdown);
        stats.put("aiRecommendedPriorityBreakdown", aiRecommendedPriorityBreakdown);
        
        double avgConf = incidentRepository.findAll().stream()
                .filter(i -> i.getRoutingConfidence() != null)
                .mapToInt(Incident::getRoutingConfidence)
                .average()
                .orElse(78.5);
        stats.put("avgRoutingConfidence", Math.round(avgConf * 10.0) / 10.0);
        
        // Simple dynamic SLA Compliance
        long slaViolated = escalated; // SLA breach automatically escalates
        long compliant = totalIncidents - slaViolated;
        double complianceRate = totalIncidents > 0 ? ((double) compliant / totalIncidents) * 100 : 100.0;
        stats.put("slaComplianceRate", Math.round(complianceRate * 10.0) / 10.0);
        stats.put("slaViolations", slaViolated);

        // Calculate average resolution time on the backend to avoid loading huge lists on frontend
        double totalMs = 0;
        int countRes = 0;
        for (ResolvedIncident r : resolvedIncidents) {
            if (r.getResolvedTime() != null && r.getTimestamp() != null) {
                try {
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                    LocalDateTime start = LocalDateTime.parse(r.getTimestamp(), formatter);
                    LocalDateTime end = LocalDateTime.parse(r.getResolvedTime(), formatter);
                    java.time.Duration duration = java.time.Duration.between(start, end);
                    long millis = duration.toMillis();
                    if (millis > 0) {
                        totalMs += millis;
                        countRes++;
                    }
                } catch (Exception e) {
                    // Ignore parsing errors
                }
            }
        }
        String avgResTime = "N/A";
        if (countRes > 0) {
            double avgHrs = totalMs / (1000.0 * 60.0 * 60.0 * countRes);
            avgResTime = String.format("%.1f Hours", avgHrs);
        }
        stats.put("avgResolutionTime", avgResTime);

        return ResponseEntity.ok(stats);
    }

    // ================= LOG REPORT HISTORY =================
    @PostMapping("/log")
    public ResponseEntity<?> logReport(@RequestBody ReportHistory report) {
        report.setGeneratedTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        ReportHistory saved = reportHistoryRepository.save(report);
        return ResponseEntity.ok(saved);
    }

    // ================= GET REPORT HISTORY =================
    @GetMapping("/history")
    public ResponseEntity<List<ReportHistory>> getReportHistory() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;
        
        List<ReportHistory> allHistory = reportHistoryRepository.findAll();
        if (currentUsername != null) {
            java.util.Optional<User> uOpt = userRepository.findByUsername(currentUsername);
            if (uOpt.isPresent()) {
                User u = uOpt.get();
                String role = u.getRole() != null ? u.getRole().toUpperCase() : "ADMIN";
                if (!"ADMIN".equals(role)) {
                    allHistory = allHistory.stream()
                            .filter(h -> currentUsername.equalsIgnoreCase(h.getGeneratedBy()))
                            .toList();
                }
            }
        }
        return ResponseEntity.ok(allHistory);
    }

    private List<Incident> filterUniqueIncidents(List<Incident> list) {
        if (list == null) return new java.util.ArrayList<>();
        java.util.Map<Long, Incident> uniqueMap = new java.util.LinkedHashMap<>();
        for (Incident inc : list) {
            if (inc != null && inc.getId() != null) {
                uniqueMap.putIfAbsent(inc.getId(), inc);
            }
        }
        return new java.util.ArrayList<>(uniqueMap.values());
    }

    private List<ResolvedIncident> filterUniqueResolvedIncidents(List<ResolvedIncident> list) {
        if (list == null) return new java.util.ArrayList<>();
        java.util.Map<Long, ResolvedIncident> uniqueMap = new java.util.LinkedHashMap<>();
        for (ResolvedIncident ri : list) {
            if (ri != null) {
                Long key = ri.getIncidentId() != null ? ri.getIncidentId() : ri.getId();
                if (key != null) {
                    uniqueMap.putIfAbsent(key, ri);
                }
            }
        }
        return new java.util.ArrayList<>(uniqueMap.values());
    }

    private ResolvedIncident convertToResolvedIncident(Incident inc) {
        if (inc == null) return null;
        ResolvedIncident r = new ResolvedIncident();
        r.setId(inc.getId());
        r.setIncidentId(inc.getId());
        r.setTitle(inc.getTitle());
        r.setCategory(inc.getCategory());
        r.setPriority(inc.getPriority());
        r.setAssignedAnalyst(inc.getAssignedTo());
        r.setResolvedTime(inc.getResolvedTime() != null ? inc.getResolvedTime() : inc.getUpdatedTime());
        r.setResolutionSummary(inc.getResolutionSummary());
        r.setReportedBy(inc.getReportedBy());
        r.setTimestamp(inc.getTimestamp());
        r.setAiSummary(inc.getAiSummary());
        r.setAdminRemarks(inc.getAdminRemarks());
        r.setSlaStatus(inc.getSlaStatus());
        r.setClosedTime(inc.getClosedTime());
        r.setCreatedTime(inc.getCreatedTime());
        r.setAssignedTime(inc.getAssignedTime());
        r.setEscalationTime(inc.getEscalationTime());
        r.setApprovalTime(inc.getApprovalTime());
        
        java.util.List<String> steps = new java.util.ArrayList<>();
        steps.add("Reported");
        if (inc.getAssignedTime() != null) {
            steps.add("Assigned");
        }
        if (inc.getEscalationTime() != null) {
            steps.add("Escalated");
        }
        if (inc.getResolvedTime() != null) {
            steps.add("Resolved");
        }
        r.setWorkflow(String.join(" -> ", steps));
        return r;
    }
}
