package com.cybersoc.controller;

import com.cybersoc.model.Incident;
import com.cybersoc.model.ResolvedIncident;
import com.cybersoc.dto.IncidentSummaryDTO;
import com.cybersoc.dto.ResolvedIncidentSummaryDTO;
import com.cybersoc.model.EscalationHistory;
import com.cybersoc.model.Notification;
import com.cybersoc.model.User;
import com.cybersoc.model.Attachment;
import com.cybersoc.repository.ResolvedIncidentRepository;
import com.cybersoc.repository.EscalationHistoryRepository;
import com.cybersoc.repository.AttachmentRepository;
import com.cybersoc.service.AuditService;
import com.cybersoc.service.IncidentService;
import com.cybersoc.service.NotificationService;
import com.cybersoc.service.AnalystAssignmentService;
import com.cybersoc.service.EmailService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentService service;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final AnalystAssignmentService assignmentService;
    private final EmailService emailService;
    
    private final ResolvedIncidentRepository resolvedIncidentRepository;
    private final EscalationHistoryRepository escalationHistoryRepository;
    private final AttachmentRepository attachmentRepository;
    private final com.cybersoc.repository.UserRepository userRepository;
    private final com.cybersoc.service.LocalAiInvestigationService localAiInvestigationService;
    private final com.cybersoc.repository.AssignmentHistoryRepository assignmentHistoryRepository;

    @org.springframework.beans.factory.annotation.Value("${ai.priority.sync:false}")
    private boolean aiPrioritySync;

    public IncidentController(IncidentService service, AuditService auditService,
                              NotificationService notificationService, AnalystAssignmentService assignmentService,
                              EmailService emailService, ResolvedIncidentRepository resolvedIncidentRepository,
                              EscalationHistoryRepository escalationHistoryRepository, 
                              AttachmentRepository attachmentRepository,
                              com.cybersoc.repository.UserRepository userRepository,
                              com.cybersoc.service.LocalAiInvestigationService localAiInvestigationService,
                              com.cybersoc.repository.AssignmentHistoryRepository assignmentHistoryRepository) {
        this.service = service;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.assignmentService = assignmentService;
        this.emailService = emailService;
        this.resolvedIncidentRepository = resolvedIncidentRepository;
        this.escalationHistoryRepository = escalationHistoryRepository;
        this.attachmentRepository = attachmentRepository;
        this.userRepository = userRepository;
        this.localAiInvestigationService = localAiInvestigationService;
        this.assignmentHistoryRepository = assignmentHistoryRepository;
    }

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private LocalDateTime parseDateTime(String dtStr) {
        if (dtStr == null || dtStr.trim().isEmpty()) {
            return null;
        }
        try {
            if (dtStr.contains("T")) {
                return LocalDateTime.parse(dtStr);
            } else {
                return LocalDateTime.parse(dtStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            }
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(dtStr, DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a", java.util.Locale.ENGLISH));
            } catch (Exception ex) {
                return null;
            }
        }
    }

    private void updateSlaStatus(Incident incident) {
        if (incident == null) {
            return;
        }
        if (incident.getSlaDeadline() == null) {
            incident.setSlaStatus("No SLA");
            return;
        }

        LocalDateTime deadline = parseDateTime(incident.getSlaDeadline());
        if (deadline == null) {
            incident.setSlaStatus("No SLA");
            return;
        }

        String status = incident.getStatus() != null ? incident.getStatus().toUpperCase() : "";
        boolean isClosedOrResolved = "CLOSED".equals(status) || "RESOLVED".equals(status) || "PENDING_APPROVAL".equals(status);

        if (isClosedOrResolved) {
            String timeStr = incident.getResolvedTime();
            if (timeStr == null || timeStr.trim().isEmpty()) {
                timeStr = incident.getClosedTime();
            }
            if (timeStr == null || timeStr.trim().isEmpty()) {
                timeStr = incident.getApprovedTime();
            }
            
            LocalDateTime completionTime = parseDateTime(timeStr);
            if (completionTime == null) {
                completionTime = LocalDateTime.now();
            }

            if (completionTime.isAfter(deadline)) {
                incident.setSlaStatus("Breached");
            } else {
                incident.setSlaStatus("Met");
            }
        } else {
            LocalDateTime now = LocalDateTime.now();
            if (now.isAfter(deadline)) {
                incident.setSlaStatus("Breached");
            } else {
                incident.setSlaStatus("Active");
            }
        }
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

    // AI priority recommendation helper
    private String recommendPriority(String category) {
        if (category == null) return "Medium";
        String cat = category.toUpperCase().trim();
        if (cat.contains("RANSOMWARE") || cat.contains("DATA LEAK") || cat.contains("DATA_LEAK")) {
            return "Critical";
        } else if (cat.contains("MALWARE") || cat.contains("PRIVILEGE") || cat.contains("PRIVILEGE ESCALATION")) {
            return "High";
        } else if (cat.contains("PHISHING") || cat.contains("NETWORK") || cat.contains("NETWORK ATTACK")) {
            return "Medium";
        } else if (cat.contains("INFORMATION") || cat.contains("INFORMATION REQUEST")) {
            return "Low";
        }
        return "Medium";
    }

    private String generateAiRecommendations(String category) {
        if (category == null) return "1. Review security logs.\n2. Flag source endpoints.";
        String cat = category.toUpperCase().trim();
        if (cat.contains("PHISH")) {
            return "1. Isolate the affected device from the local network segment immediately.\n" +
                   "2. Revoke active OAuth sessions and force-reset user credentials.\n" +
                   "3. Purge the suspicious message from mail servers company-wide.\n" +
                   "4. Deploy network blocks on outbound connections targeting discovered domains.";
        } else if (cat.contains("MALWARE")) {
            return "1. Run host-level quarantine scripts using the centralized endpoint agent.\n" +
                   "2. Retrieve memory dumps and volatile file logs for forensic analysis.\n" +
                   "3. Deploy local firewall rules block list updates to network gates.\n" +
                   "4. Perform threat hunt queries across all server nodes looking for related indicators.";
        } else if (cat.contains("NET") || cat.contains("PORT")) {
            return "1. Analyze network packets capture log registries around the timestamp.\n" +
                   "2. Implement outbound traffic blocks on discovered command server IPs.\n" +
                   "3. Deploy web firewall routing rules to deny requests targeting target endpoints.\n" +
                   "4. Review access credentials logs checking for signs of account brute forcing.";
        } else if (cat.contains("RANSOM")) {
            return "1. Terminate physical and virtual networking links for the target machine.\n" +
                   "2. Shut down file storage access permissions immediately to block shares encryption.\n" +
                   "3. Assess offline snapshots and local volumes backup verification chains.\n" +
                   "4. Initiate backup recovery protocols to restore affected file directories.";
        } else {
            return "1. Review security logs and system trace directories around report timestamp.\n" +
                   "2. Flag source endpoints and check host system configurations metrics.\n" +
                   "3. Alert operations response teams and initialize audit logging rules.";
        }
    }

    // SLA duration helper
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

    // ================= GET ALL (ACTIVE + RESOLVED) =================
    @GetMapping
    public List<IncidentSummaryDTO> getAll() {
        List<Incident> activeIncidents = service.getAll();
        activeIncidents.forEach(this::syncDescriptionDepartment);
        activeIncidents.forEach(this::updateSlaStatus);
        
        List<Incident> filtered;
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String currentUsername = auth.getName();
            java.util.Optional<User> userOpt = userRepository.findByUsername(currentUsername);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String role = user.getRole() != null ? user.getRole().toUpperCase() : "";
                if ("ANALYST".equals(role)) {
                    String spec = user.getSpecialization();
                    filtered = filterUniqueIncidents(activeIncidents.stream().filter(inc -> {
                        boolean isAssignedToMe = currentUsername.equalsIgnoreCase(inc.getAssignedTo());
                        boolean isSpecializationMatch = com.cybersoc.service.AnalystAssignmentService.doesSpecializationMatch(inc.getCategory(), spec);
                        return isAssignedToMe || isSpecializationMatch;
                    }).toList());
                    return filtered.stream().map(IncidentSummaryDTO::new).toList();
                } else if ("EMPLOYEE".equals(role)) {
                    filtered = filterUniqueIncidents(activeIncidents.stream().filter(inc -> currentUsername.equalsIgnoreCase(inc.getReportedBy())).toList());
                    return filtered.stream().map(IncidentSummaryDTO::new).toList();
                }
            }
        }
        filtered = filterUniqueIncidents(activeIncidents);
        return filtered.stream().map(IncidentSummaryDTO::new).toList();
    }

    @GetMapping("/active")
    public List<IncidentSummaryDTO> getActive() {
        List<Incident> activeIncidents = service.findActiveIncidents();
        activeIncidents.forEach(this::syncDescriptionDepartment);
        activeIncidents.forEach(this::updateSlaStatus);
        
        List<Incident> filtered;
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String currentUsername = auth.getName();
            java.util.Optional<User> userOpt = userRepository.findByUsername(currentUsername);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String role = user.getRole() != null ? user.getRole().toUpperCase() : "";
                if ("ANALYST".equals(role)) {
                    String spec = user.getSpecialization();
                    filtered = filterUniqueIncidents(activeIncidents.stream().filter(inc -> {
                        boolean isAssignedToMe = currentUsername.equalsIgnoreCase(inc.getAssignedTo());
                        boolean isSpecializationMatch = com.cybersoc.service.AnalystAssignmentService.doesSpecializationMatch(inc.getCategory(), spec);
                        return isAssignedToMe || isSpecializationMatch;
                    }).toList());
                    return filtered.stream().map(IncidentSummaryDTO::new).toList();
                } else if ("EMPLOYEE".equals(role)) {
                    filtered = filterUniqueIncidents(activeIncidents.stream().filter(inc -> currentUsername.equalsIgnoreCase(inc.getReportedBy())).toList());
                    return filtered.stream().map(IncidentSummaryDTO::new).toList();
                }
            }
        }
        filtered = filterUniqueIncidents(activeIncidents);
        return filtered.stream().map(IncidentSummaryDTO::new).toList();
    }

    private Incident convertToIncident(ResolvedIncident resolved) {
        if (resolved == null) return null;
        Incident inc = new Incident();
        inc.setId(resolved.getIncidentId() != null ? resolved.getIncidentId() : resolved.getId());
        inc.setTitle(resolved.getTitle());
        inc.setPriority(resolved.getPriority());
        inc.setRecommendedPriority(resolved.getRecommendedPriority());
        inc.setStatus("RESOLVED");
        inc.setAssignedTo(resolved.getAssignedAnalyst());
        inc.setAssignedAnalystName(resolved.getAssignedAnalyst());
        inc.setCategory(resolved.getCategory());
        inc.setDescription(resolved.getResolutionSummary());
        inc.setReportedBy(resolved.getReportedBy());
        inc.setTimestamp(resolved.getTimestamp());
        inc.setResolvedTime(resolved.getResolvedTime());
        inc.setClosedTime(resolved.getClosedTime());
        inc.setUpdatedTime(resolved.getResolvedTime());
        inc.setApprovedBy(resolved.getApprovedBy());
        inc.setApprovedTime(resolved.getResolvedTime());
        inc.setSlaDeadline(resolved.getResolvedTime());
        inc.setSlaStatus(resolved.getSlaStatus());
        inc.setChecklistState(resolved.getChecklistState());
        inc.setCreatedTime(resolved.getCreatedTime());
        inc.setAssignedTime(resolved.getAssignedTime());
        inc.setEscalationTime(resolved.getEscalationTime());
        inc.setApprovalTime(resolved.getApprovalTime());
        return inc;
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

    // ================= GET OWN INCIDENTS =================
    @GetMapping("/user/{username}")
    public List<IncidentSummaryDTO> getByUser(@PathVariable String username) {
        List<Incident> userIncidents = service.findActiveIncidents().stream()
                .filter(i -> username.equalsIgnoreCase(i.getReportedBy()))
                .toList();
        userIncidents.forEach(this::syncDescriptionDepartment);
        userIncidents.forEach(this::updateSlaStatus);
        List<Incident> filtered = filterUniqueIncidents(userIncidents);
        return filtered.stream().map(IncidentSummaryDTO::new).toList();
    }

    @GetMapping("/my-incidents/{username}")
    public List<IncidentSummaryDTO> getMyIncidents(@PathVariable String username) {
        List<Incident> allActive = service.findActiveIncidents();
        allActive.forEach(this::syncDescriptionDepartment);
        
        List<Incident> activeAssigned = allActive.stream()
                .filter(i -> i.getAssignedTo() != null && 
                    (i.getAssignedTo().equalsIgnoreCase(username) || 
                     i.getAssignedTo().toLowerCase().startsWith(username.toLowerCase() + " (") ||
                     i.getAssignedTo().toLowerCase().startsWith(username.toLowerCase() + " ")))
                .toList();
        
        activeAssigned.forEach(this::updateSlaStatus);
        List<Incident> filtered = filterUniqueIncidents(activeAssigned);
        return filtered.stream().map(IncidentSummaryDTO::new).toList();
    }

    @GetMapping("/resolved")
    public List<ResolvedIncidentSummaryDTO> getResolvedIncidents() {
        List<ResolvedIncident> allResolved = new java.util.ArrayList<>(resolvedIncidentRepository.findAll());
        
        List<Incident> activeResolved = service.getAll().stream()
                .filter(i -> "RESOLVED".equalsIgnoreCase(i.getStatus()) || 
                             "PENDING_APPROVAL".equalsIgnoreCase(i.getStatus()) || 
                             "PENDING_ADMIN_APPROVAL".equalsIgnoreCase(i.getStatus()) ||
                             "CLOSED".equalsIgnoreCase(i.getStatus()))
                .toList();
                
        for (Incident inc : activeResolved) {
            ResolvedIncident r = convertToResolvedIncident(inc);
            if (r != null) {
                allResolved.add(r);
            }
        }
        
        List<ResolvedIncident> filtered;
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String currentUsername = auth.getName();
            java.util.Optional<User> userOpt = userRepository.findByUsername(currentUsername);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String role = user.getRole() != null ? user.getRole().toUpperCase() : "";
                if ("ANALYST".equals(role)) {
                    String spec = user.getSpecialization();
                    filtered = filterUniqueResolvedIncidents(allResolved.stream().filter(inc -> {
                        boolean isAssignedToMe = currentUsername.equalsIgnoreCase(inc.getAssignedAnalyst());
                        boolean isSpecializationMatch = com.cybersoc.service.AnalystAssignmentService.doesSpecializationMatch(inc.getCategory(), spec);
                        return isAssignedToMe || isSpecializationMatch;
                    }).toList());
                    return filtered.stream().map(ResolvedIncidentSummaryDTO::new).toList();
                } else if ("EMPLOYEE".equals(role)) {
                    filtered = filterUniqueResolvedIncidents(allResolved.stream().filter(inc -> 
                        currentUsername.equalsIgnoreCase(inc.getReportedBy())
                    ).toList());
                    return filtered.stream().map(ResolvedIncidentSummaryDTO::new).toList();
                }
            }
        }
        filtered = filterUniqueResolvedIncidents(allResolved);
        return filtered.stream().map(ResolvedIncidentSummaryDTO::new).toList();
    }

    @GetMapping("/pending-approval")
    public List<IncidentSummaryDTO> getPendingApproval() {
        List<Incident> allIncidents = service.getAll();
        allIncidents.forEach(this::syncDescriptionDepartment);
        allIncidents.forEach(this::updateSlaStatus);
        
        List<Incident> pending = allIncidents.stream()
                .filter(i -> "PENDING_APPROVAL".equalsIgnoreCase(i.getStatus()) || 
                             "PENDING_ADMIN_APPROVAL".equalsIgnoreCase(i.getStatus()))
                .toList();
                
        List<Incident> filtered;
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String currentUsername = auth.getName();
            java.util.Optional<User> userOpt = userRepository.findByUsername(currentUsername);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String role = user.getRole() != null ? user.getRole().toUpperCase() : "";
                if ("ANALYST".equals(role)) {
                    String spec = user.getSpecialization();
                    filtered = filterUniqueIncidents(pending.stream().filter(inc -> {
                        boolean isAssignedToMe = currentUsername.equalsIgnoreCase(inc.getAssignedTo());
                        boolean isSpecializationMatch = com.cybersoc.service.AnalystAssignmentService.doesSpecializationMatch(inc.getCategory(), spec);
                        return isAssignedToMe || isSpecializationMatch;
                    }).toList());
                    return filtered.stream().map(IncidentSummaryDTO::new).toList();
                } else if ("EMPLOYEE".equals(role)) {
                    filtered = filterUniqueIncidents(pending.stream().filter(inc -> 
                        currentUsername.equalsIgnoreCase(inc.getReportedBy())
                    ).toList());
                    return filtered.stream().map(IncidentSummaryDTO::new).toList();
                }
            }
        }
        filtered = filterUniqueIncidents(pending);
        return filtered.stream().map(IncidentSummaryDTO::new).toList();
    }

    // ================= AI ANALYST RECOMMENDATION =================
    @GetMapping("/{id}/recommend-analyst")
    public ResponseEntity<Map<String, Object>> recommendAnalyst(@PathVariable Long id) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return ResponseEntity.notFound().build();
        }

        List<User> activeAnalysts = userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && "ANALYST".equalsIgnoreCase(u.getRole().trim()))
                .filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()))
                .toList();

        if (activeAnalysts.isEmpty()) {
            Map<String, Object> errRes = new HashMap<>();
            errRes.put("score", 0);
            errRes.put("recommendedAnalystUsername", "");
            errRes.put("recommendedAnalystName", "No Analyst Available");
            errRes.put("reasons", List.of("No active analysts found in SOC roster."));
            return ResponseEntity.ok(errRes);
        }

        User bestAnalyst = null;
        double maxScore = -1.0;
        List<String> bestReasons = new java.util.ArrayList<>();
        long bestWorkload = 999;
        long bestSimilar = 0;

        for (User analyst : activeAnalysts) {
            boolean specMatch = com.cybersoc.service.AnalystAssignmentService.doesSpecializationMatch(incident.getCategory(), analyst.getSpecialization());
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

            long activeWorkload = service.getAll().stream()
                    .filter(i -> analyst.getUsername().equalsIgnoreCase(i.getAssignedTo()) && !"CLOSED".equalsIgnoreCase(i.getStatus()) && !"RESOLVED".equalsIgnoreCase(i.getStatus()))
                    .count();
            double workloadScore = Math.max(0.0, 100.0 - (activeWorkload * 10.0));

            long similarResolved = resolvedIncidentRepository.findAll().stream()
                    .filter(r -> analyst.getUsername().equalsIgnoreCase(r.getAssignedAnalyst()) && incident.getCategory().equalsIgnoreCase(r.getCategory()))
                    .count();
            double experienceScore = Math.min(100.0, similarResolved * 10.0);

            double performanceScore = analyst.getPerformanceScore() != null ? analyst.getPerformanceScore() : 0.0;

            double finalScore = assignmentService.calculateAnalystScore(incident, analyst);

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

                List<String> reasons = new java.util.ArrayList<>();
                if (specMatch) {
                    reasons.add("Specialization matches incident category");
                } else {
                    reasons.add("Cross-training opportunity (specialization does not match)");
                }

                if (similarResolved > 0) {
                    reasons.add("Resolved " + similarResolved + " similar incidents");
                } else {
                    reasons.add("Caseload capacity available for this category");
                }

                if (activeWorkload <= 2) {
                    reasons.add("Current workload is low");
                } else if (activeWorkload <= 5) {
                    reasons.add("Current workload is moderate");
                } else {
                    reasons.add("Workload is manageable");
                }

                if (performanceScore >= 80.0) {
                    reasons.add("High resolution success rate (" + String.format("%.1f", performanceScore) + "%)");
                } else if (performanceScore >= 60.0) {
                    reasons.add("Good resolution success rate (" + String.format("%.1f", performanceScore) + "%)");
                } else {
                    reasons.add("Established resolution history");
                }

                if (levelScore == 100.0) {
                    reasons.add("Analyst tier matches threat classification level");
                }

                bestReasons = reasons;
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("score", (int) Math.round(maxScore));
        res.put("recommendedAnalystUsername", bestAnalyst != null ? bestAnalyst.getUsername() : "");
        res.put("recommendedAnalystName", bestAnalyst != null ? bestAnalyst.getFullName() : "");
        res.put("reasons", bestReasons);

        return ResponseEntity.ok(res);
    }

    // ================= AI INCIDENT CLOSURE VALIDATION =================
    @GetMapping("/{id}/validate-closure")
    public ResponseEntity<Map<String, Object>> validateClosure(@PathVariable Long id) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return ResponseEntity.notFound().build();
        }

        List<com.cybersoc.model.Attachment> attachments = attachmentRepository.findByIncidentId(id);
        
        int totalChecklist = 0;
        int checkedChecklist = 0;
        String chState = incident.getChecklistState();
        if (chState != null && !chState.trim().isEmpty()) {
            int idx = 0;
            while ((idx = chState.indexOf("\"item\"", idx)) != -1) {
                totalChecklist++;
                idx += 6;
            }
            idx = 0;
            while ((idx = chState.indexOf("\"checked\":true", idx)) != -1) {
                checkedChecklist++;
                idx += 14;
            }
        }

        int score = 100;
        List<String> checkpoints = new java.util.ArrayList<>();

        // 1. Resolution Summary
        String resSummary = incident.getResolutionSummary();
        if (resSummary == null || resSummary.trim().isEmpty() || resSummary.trim().length() < 10) {
            score -= 30;
            checkpoints.add("✗ Resolution summary missing or too short");
        } else if (resSummary.trim().length() < 30) {
            score -= 15;
            checkpoints.add("✓ Resolution summary provided");
        } else {
            checkpoints.add("✓ Resolution summary complete");
        }

        // 2. Analyst Notes
        String notes = incident.getAnalystNotes();
        if (notes == null || notes.trim().isEmpty() || notes.trim().length() < 5) {
            score -= 20;
            checkpoints.add("✗ Analyst notes are missing");
        } else if (notes.trim().length() < 20) {
            score -= 10;
            checkpoints.add("✓ Analyst notes available");
        } else {
            checkpoints.add("✓ Analyst notes complete");
        }

        // 3. Evidence Availability
        if (attachments.isEmpty()) {
            score -= 20;
            checkpoints.add("✗ Evidence attachments missing");
        } else {
            checkpoints.add("✓ Evidence attachments uploaded");
        }

        // 4. Checklist Completeness
        if (totalChecklist == 0) {
            score -= 15;
            checkpoints.add("✗ Checklist verification not started");
        } else if (checkedChecklist < totalChecklist) {
            double penalty = 15.0 * (1.0 - (double) checkedChecklist / totalChecklist);
            score -= (int) Math.round(penalty);
            checkpoints.add("✗ Checklist incomplete (" + checkedChecklist + "/" + totalChecklist + " completed)");
        } else {
            checkpoints.add("✓ Checklist verification completed");
        }

        // 5. Priority Mismatch
        String prio = incident.getPriority();
        String recPrio = incident.getRecommendedPriority();
        if (prio != null && recPrio != null && !prio.equalsIgnoreCase(recPrio)) {
            List<String> ranks = List.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
            int prioIdx = ranks.indexOf(prio.toUpperCase());
            int recPrioIdx = ranks.indexOf(recPrio.toUpperCase());
            if (prioIdx < recPrioIdx) {
                score -= 15;
                checkpoints.add("✗ Priority mismatch detected (AI recommends higher priority)");
            } else {
                checkpoints.add("✓ Priority alignment validated");
            }
        } else {
            checkpoints.add("✓ Priority alignment validated");
        }

        score = Math.max(0, Math.min(100, score));

        String recommendation;
        if (score >= 70) {
            recommendation = "Approved for Closure";
        } else {
            recommendation = "Recommend additional investigation before closure: Check resolution summary and ensure checklist items are verified.";
        }

        Map<String, Object> response = new HashMap<>();
        response.put("score", score);
        response.put("checkpoints", checkpoints);
        response.put("recommendation", recommendation);

        return ResponseEntity.ok(response);
    }

    // ================= CREATE INCIDENT (ADMIN) =================
    @PostMapping
    public Incident create(@RequestBody Incident incident) {
        incident.setTimestamp(now());
        incident.setUpdatedTime(incident.getTimestamp());
        incident.setCreatedTime(incident.getTimestamp());
        
        // AI Recommendation
        String rec = recommendPriority(incident.getCategory());
        incident.setRecommendedPriority(rec);
        
        // If final priority is not provided, use recommended
        if (incident.getPriority() == null) {
            incident.setPriority(rec);
        }
        
        incident.setSlaDeadline(calculateSlaDeadline(incident.getPriority()));

        if (incident.getStatus() == null || incident.getStatus().equalsIgnoreCase("Open")) {
            incident.setStatus("OPEN");
        } else {
            incident.setStatus(incident.getStatus().toUpperCase());
        }

        incident.setAiSummary(generateAiSummary(incident.getCategory(), incident.getDescription()));
        incident.setAiRecommendedActions(generateAiRecommendations(incident.getCategory()));
        updateSlaStatus(incident);
        Incident saved = service.save(incident);
        saved = assignmentService.autoAssignWithAi(saved);
        
        auditService.log(
                incident.getReportedBy() != null ? incident.getReportedBy() : "Admin",
                "INCIDENT CREATED",
                String.valueOf(saved.getId()),
                saved.getTitle(),
                "None",
                saved.getStatus()
        );

        // Notify Admin
        notificationService.send(new Notification(
                "CREATED",
                "New incident INC-" + String.format("%06d", saved.getId()) + " created by Admin",
                "admin"
        ));

        // Notify Employee if specified
        if (saved.getReportedBy() != null && !saved.getReportedBy().equalsIgnoreCase("Admin")) {
            notificationService.send(new Notification(
                    "CREATED",
                    "Your incident INC-" + String.format("%06d", saved.getId()) + " was created.",
                    saved.getReportedBy()
            ));
        }

        return saved;
    }

    // ================= REPORT INCIDENT (EMPLOYEE) =================
    @PostMapping("/report")
    public Incident report(@RequestBody Incident incident) {
        incident.setTimestamp(now());
        incident.setUpdatedTime(incident.getTimestamp());
        incident.setCreatedTime(incident.getTimestamp());
        incident.setStatus("OPEN");
        incident.setSource("Employee");

        // AI Recommendation
        String rec = recommendPriority(incident.getCategory());
        incident.setRecommendedPriority(rec);
        incident.setPriority(rec); // Set priority automatically
        incident.setSlaDeadline(calculateSlaDeadline(rec));

        incident.setAiSummary(generateAiSummary(incident.getCategory(), incident.getDescription()));
        incident.setAiRecommendedActions(generateAiRecommendations(incident.getCategory()));
        updateSlaStatus(incident);
        Incident saved = service.save(incident);

        // Timeline: Incident Reported
        auditService.log(
                saved.getReportedBy() != null ? saved.getReportedBy() : "Employee",
                "Incident Reported",
                String.valueOf(saved.getId()),
                saved.getTitle(),
                "None",
                saved.getStatus()
        );

        // Workload-based escalation chain auto assignment
        saved = assignmentService.autoAssignWithAi(saved);

        return saved;
    }

    // ================= GET BY ID =================
    @GetMapping("/{id}")
    public ResponseEntity<Incident> getById(@PathVariable Long id) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return ResponseEntity.notFound().build();
        }
        syncDescriptionDepartment(incident);
        updateSlaStatus(incident);

        try {
            auditService.log("AI Assistant", "MITRE Mapping Generated", String.valueOf(incident.getId()), incident.getTitle(), "None", "MITRE_MAPPING");
            auditService.log("AI Assistant", "IOC Extraction Completed", String.valueOf(incident.getId()), incident.getTitle(), "None", "IOC_EXTRACTION");
            if (checkHasRelated(incident)) {
                auditService.log("AI Assistant", "Related Incident Linked", String.valueOf(incident.getId()), incident.getTitle(), "None", "RELATED_INCIDENTS");
            }
        } catch (Exception e) {
            System.err.println("Failed to log auto audit events on getById: " + e.getMessage());
        }

        return ResponseEntity.ok(incident);
    }

    // ================= UPDATE STATUS =================
    @PutMapping("/{id}/status")
    public Incident updateStatus(@PathVariable Long id, @RequestBody Incident req) {
        Incident incident = service.getByIdOrNull(id);
        if (incident != null) {
            String oldStatus = incident.getStatus();
            String oldPriority = incident.getPriority();
            incident.setStatus(req.getStatus());
            if (req.getPriority() != null) {
                incident.setPriority(req.getPriority());
            }
            incident.setUpdatedTime(now());
            service.save(incident);

            // Notify status change
            if (!oldStatus.equalsIgnoreCase(incident.getStatus())) {
                String msg = "Incident INC-" + String.format("%06d", incident.getId()) + " status has been updated to " + incident.getStatus();
                if (incident.getReportedBy() != null) {
                    notificationService.send(new Notification("STATUS_CHANGED", msg, incident.getReportedBy()));
                }
                if (incident.getAssignedTo() != null) {
                    notificationService.send(new Notification("STATUS_CHANGED", msg, incident.getAssignedTo()));
                }
                notificationService.send(new Notification("STATUS_CHANGED", msg, "admin"));
            }

            // Notify priority change
            if (req.getPriority() != null && !req.getPriority().equalsIgnoreCase(oldPriority)) {
                String msg = "Incident INC-" + String.format("%06d", incident.getId()) + " priority has been updated to " + req.getPriority();
                if (incident.getReportedBy() != null) {
                    notificationService.send(new Notification("PRIORITY_UPDATED", msg, incident.getReportedBy()));
                }
                if (incident.getAssignedTo() != null) {
                    notificationService.send(new Notification("PRIORITY_UPDATED", msg, incident.getAssignedTo()));
                }
                notificationService.send(new Notification("PRIORITY_UPDATED", msg, "admin"));
            }

            auditService.log(
                    "analyst",
                    "STATUS UPDATED",
                    String.valueOf(id),
                    incident.getTitle(),
                    oldStatus,
                    incident.getStatus()
            );
            return incident;
        }
        return null;
    }

    // ================= ASSIGN =================
    @PutMapping("/{id}/assign")
    public Incident assignIncident(@PathVariable Long id, @RequestBody Map<String, String> req) {
        Incident incident = service.getByIdOrNull(id);
        if (incident != null) {
            String oldAssignee = incident.getAssignedTo();
            String newAssignee = req.get("assignedTo");
            if (newAssignee != null) {
                newAssignee = newAssignee.trim();
                if (newAssignee.contains(" ")) {
                    newAssignee = newAssignee.split(" ")[0];
                }
            }
            String newAssigneeName = req.get("assignedAnalystName");

            incident.setAssignedTo(newAssignee);
            if (newAssigneeName != null) {
                incident.setAssignedAnalystName(newAssigneeName);
            }
            User analyst = userRepository.findByUsername(newAssignee).orElse(null);
            if (analyst != null) {
                incident.setEscalationLevel(analyst.getAnalystLevel());
                analyst.setLastAssignmentTime(now());
                userRepository.save(analyst);
                assignmentService.syncAnalystStats(analyst);
            }
            if (oldAssignee != null && !"Unassigned".equalsIgnoreCase(oldAssignee)) {
                User oldUser = userRepository.findByUsername(oldAssignee).orElse(null);
                if (oldUser != null) {
                    assignmentService.syncAnalystStats(oldUser);
                }
            } else if ("Management Review".equals(newAssignee)) {
                incident.setEscalationLevel("Management");
            }
            incident.setAssignedTime(now());
            incident.setStatus("UNDER_INVESTIGATION");
            incident.setUpdatedTime(now());
            service.save(incident);

            String spec = (analyst != null && analyst.getSpecialization() != null) ? analyst.getSpecialization() : "Others";
            boolean isOverride = !com.cybersoc.service.AnalystAssignmentService.doesSpecializationMatch(incident.getCategory(), spec);

            com.cybersoc.model.AssignmentHistory ah = new com.cybersoc.model.AssignmentHistory();
            ah.setIncidentId(incident.getId());
            ah.setAssignedBy("admin");
            ah.setAssignedTo(newAssignee);
            ah.setAssignedToName(newAssigneeName);
            ah.setIncidentCategory(incident.getCategory());
            ah.setAnalystSpecialization(spec);
            ah.setOverride(isOverride);
            ah.setAssignmentTime(now());
            assignmentHistoryRepository.save(ah);

            if (oldAssignee != null && !oldAssignee.trim().isEmpty() && !"Unassigned".equalsIgnoreCase(oldAssignee) && !oldAssignee.equalsIgnoreCase(newAssignee)) {
                auditService.log(
                        "admin",
                        "MANUAL OVERRIDE ASSIGNMENT",
                        String.valueOf(id),
                        incident.getTitle(),
                        "AI Recommended: " + oldAssignee,
                        "Overridden to: " + newAssignee,
                        "127.0.0.1",
                        "Admin manually overrode the assignment from " + oldAssignee + " to " + newAssignee
                );
            }

            if (isOverride) {
                auditService.log(
                        "admin",
                        "SPECIALIZATION OVERRIDE ASSIGNMENT",
                        String.valueOf(id),
                        incident.getTitle(),
                        incident.getCategory() + " -> " + spec,
                        newAssignee
                );
                auditService.log(
                        "System",
                        "Incident Assigned (Override)",
                        String.valueOf(id),
                        incident.getTitle(),
                        oldAssignee != null ? oldAssignee : "Unassigned",
                        newAssignee
                );
            } else {
                auditService.log(
                        "admin",
                        "INCIDENT ASSIGNED",
                        String.valueOf(id),
                        incident.getTitle(),
                        oldAssignee != null ? oldAssignee : "Unassigned",
                        newAssignee
                );
                auditService.log(
                        "System",
                        "Assigned to Analyst",
                        String.valueOf(id),
                        incident.getTitle(),
                        oldAssignee != null ? oldAssignee : "Unassigned",
                        newAssignee
                );
            }

            // Notify new Analyst (New Assignment)
            notificationService.send(new Notification(
                    "ASSIGNED",
                    "Incident INC-" + String.format("%06d", incident.getId()) + " assigned to you (" + incident.getTitle() + ")",
                    newAssignee
            ));

            // Notify previous Analyst if re-assigned
            if (oldAssignee != null && !oldAssignee.equalsIgnoreCase("Unassigned") && !oldAssignee.equalsIgnoreCase(newAssignee)) {
                notificationService.send(new Notification(
                        "REASSIGNED",
                        "Incident INC-" + String.format("%06d", incident.getId()) + " has been reassigned to " + incident.getAssignedAnalystName(),
                        oldAssignee
                ));
            }

            // Notify Admin (Analyst Assignment)
            notificationService.send(new Notification(
                    "ASSIGNED",
                    "Incident INC-" + String.format("%06d", incident.getId()) + " assigned to Analyst " + incident.getAssignedAnalystName(),
                    "admin"
            ));

            // Notify Employee
            if (incident.getReportedBy() != null) {
                notificationService.send(new Notification(
                        "ASSIGNED",
                        "Analyst " + incident.getAssignedAnalystName() + " has been assigned to investigate your incident INC-" + String.format("%06d", incident.getId()),
                        incident.getReportedBy()
                ));
            }

            return incident;
        }
        return null;
    }

    // ================= ESCALATE (MANUAL) =================
    @PutMapping("/{id}/escalate")
    public Incident escalate(@PathVariable Long id) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return null;
        }
        checkAuth(incident);

        assignmentService.escalateIncident(incident, "Manual", "Manual escalation by analyst");
        return service.getByIdOrNull(id);
    }

    @PutMapping("/{id}/notes")
    public Incident updateNotes(@PathVariable Long id, @RequestBody Incident req) {
        Incident incident = service.getByIdOrNull(id);
        if (incident != null) {
            checkAuth(incident);
            String oldNotes = incident.getAnalystNotes();
            incident.setAnalystNotes(req.getAnalystNotes());
            incident.setUpdatedTime(now());
            service.save(incident);

            // Generate notification for comment
            String msg = "A new comment/note was added to incident INC-" + String.format("%06d", incident.getId()) + " (" + incident.getTitle() + ")";
            if (incident.getReportedBy() != null) {
                notificationService.send(new Notification("COMMENT_ADDED", msg, incident.getReportedBy()));
            }
            if (incident.getAssignedTo() != null) {
                notificationService.send(new Notification("COMMENT_ADDED", msg, incident.getAssignedTo()));
            }
            notificationService.send(new Notification("COMMENT_ADDED", msg, "admin"));

            auditService.log(
                    getCurrentUsername(),
                    "NOTES UPDATED",
                    String.valueOf(id),
                    incident.getTitle(),
                    oldNotes != null ? "Exist" : "None",
                    "Updated"
            );
            return incident;
        }
        return null;
    }

    // ================= ADMIN REMARKS =================
    @PutMapping("/{id}/remarks")
    public Incident updateAdminRemarks(@PathVariable Long id, @RequestBody Map<String, String> req) {
        Incident incident = service.getByIdOrNull(id);
        if (incident != null) {
            incident.setAdminRemarks(req.get("adminRemarks"));
            incident.setUpdatedTime(now());
            Incident saved = service.save(incident);
            
            auditService.log(
                    getCurrentUsername(),
                    "ADMIN REMARKS UPDATED",
                    String.valueOf(id),
                    incident.getTitle(),
                    "None",
                    "Updated"
            );
            return saved;
        }
        return null;
    }

    // ================= RESOLUTION =================
    @PutMapping("/{id}/resolution")
    public Incident updateResolution(@PathVariable Long id, @RequestBody Incident req) {
        Incident incident = service.getByIdOrNull(id);
        if (incident != null) {
            checkAuth(incident);
            incident.setResolutionSummary(req.getResolutionSummary());
            incident.setUpdatedTime(now());
            return service.save(incident);
        }
        return null;
    }

    // ================= SUBMIT FOR APPROVAL =================
    @PutMapping("/{id}/submit-for-approval")
    public Incident submitForApproval(@PathVariable Long id) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return null;
        }
        checkAuth(incident);
        incident.setStatus("PENDING_APPROVAL");
        incident.setResolvedTime(now());
        incident.setUpdatedTime(now());
        updateSlaStatus(incident);
        Incident saved = service.save(incident);

        // Audit Log
        auditService.log(
                incident.getAssignedTo() != null ? incident.getAssignedTo() : "Analyst",
                "INCIDENT RESOLUTION SUBMITTED",
                String.valueOf(id),
                incident.getTitle(),
                "None",
                "PENDING_APPROVAL"
        );

        // Notify Employee
        if (incident.getReportedBy() != null) {
            notificationService.send(new Notification(
                    "RESOLVED",
                    "Your incident INC-" + String.format("%06d", incident.getId()) + " has been resolved by Analyst and is pending Admin approval.",
                    incident.getReportedBy()
            ));
        }

        // Notify Analyst
        if (incident.getAssignedTo() != null) {
            notificationService.send(new Notification(
                    "STATUS_CHANGED",
                    "Incident INC-" + String.format("%06d", incident.getId()) + " resolution submitted for Admin approval.",
                    incident.getAssignedTo()
            ));
        }

        // Notify Admin
        notificationService.send(new Notification(
                "PENDING",
                "Incident INC-" + String.format("%06d", incident.getId()) + " is pending approval.",
                "admin"
        ));

        return saved;
    }

    // ================= APPROVE (ARCHIVE) =================
    @PutMapping("/{id}/approve")
    public Incident approveIncident(@PathVariable Long id, @RequestBody(required = false) Map<String, String> req) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return null;
        }

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String approver = auth != null ? auth.getName() : "Admin";

        String adminRemarks = req != null ? req.get("adminRemarks") : null;
        String approvedByUser = (req != null && req.get("approvedBy") != null) ? req.get("approvedBy") : approver;

        incident.setStatus("CLOSED");
        incident.setAdminRemarks(adminRemarks);
        incident.setApprovedBy(approvedByUser);
        incident.setApprovedAt(now());
        incident.setApprovalTime(now());
        incident.setClosedTime(now());
        incident.setUpdatedTime(now());
        updateSlaStatus(incident);
        Incident savedIncident = service.save(incident);



        // Save into resolved_incidents table
        ResolvedIncident resolved = new ResolvedIncident();
        resolved.setIncidentId(incident.getId());
        resolved.setTitle(incident.getTitle());
        resolved.setCategory(incident.getCategory());
        resolved.setPriority(incident.getPriority());
        resolved.setAssignedAnalyst(incident.getAssignedTo());
        resolved.setApprovedBy(approvedByUser);
        resolved.setResolvedTime(incident.getResolvedTime() != null ? incident.getResolvedTime() : now());
        resolved.setResolutionSummary(incident.getResolutionSummary());
        resolved.setReportedBy(incident.getReportedBy());
        resolved.setTimestamp(incident.getTimestamp());
        resolved.setAiSummary(incident.getAiSummary());
        resolved.setAdminRemarks(adminRemarks);
        resolved.setAiAssistantSummary(incident.getAiAssistantSummary());
        resolved.setAiAssistantRootCause(incident.getAiAssistantRootCause());
        resolved.setAiAssistantInvestigationSteps(incident.getAiAssistantInvestigationSteps());
        resolved.setAiAssistantContainmentActions(incident.getAiAssistantContainmentActions());
        resolved.setAiAssistantKeyIndicators(incident.getAiAssistantKeyIndicators());
        resolved.setAiAssistantRecommendedResolution(incident.getAiAssistantRecommendedResolution());
        resolved.setAiAssistantRiskLevel(incident.getAiAssistantRiskLevel());
        resolved.setAiAssistantConfidenceScore(incident.getAiAssistantConfidenceScore());
        resolved.setAiAssistantGeneratedTime(incident.getAiAssistantGeneratedTime());
        resolved.setPreviousPriority(incident.getPreviousPriority());
        resolved.setRecommendedPriority(incident.getRecommendedPriority());
        resolved.setAiRecommendationStatus(incident.getAiRecommendationStatus());
        resolved.setAiRejectionReason(incident.getAiRejectionReason());
        resolved.setChecklistState(incident.getChecklistState());
        
        resolved.setCreatedTime(incident.getCreatedTime());
        resolved.setAssignedTime(incident.getAssignedTime());
        resolved.setEscalationTime(incident.getEscalationTime());
        resolved.setApprovalTime(incident.getApprovalTime());
        resolved.setClosedTime(incident.getClosedTime());

        resolved.setSlaStatus(incident.getSlaStatus());

        // Build dynamic workflow history representation
        java.util.List<String> steps = new java.util.ArrayList<>();
        steps.add("Reported");
        if (incident.getAssignedTime() != null) {
            steps.add("Assigned");
        }
        if (incident.getEscalationTime() != null) {
            steps.add("Escalated");
        }
        if (incident.getResolvedTime() != null) {
            steps.add("Resolved");
        }
        steps.add("Approved & Closed");
        resolved.setWorkflow(String.join(" -> ", steps));

        resolvedIncidentRepository.save(resolved);

        if (incident.getAssignedTo() != null) {
            User analyst = userRepository.findByUsername(incident.getAssignedTo()).orElse(null);
            if (analyst != null) {
                assignmentService.syncAnalystStats(analyst);
            }
        }

        // Delete the active incident from the primary incidents table
        service.delete(id);

        // Send Notification to Employee, Analyst, and Admin
        String resolveMsg = "Incident INC-" + String.format("%06d", incident.getId()) + " resolution has been approved and closed (" + incident.getTitle() + ")";
        if (incident.getReportedBy() != null) {
            notificationService.send(new Notification("CLOSED", "Your reported incident has been resolved and closed.", incident.getReportedBy()));
            
            emailService.sendIncidentNotification(
                    incident.getReportedBy() + "@cybersoc.com", // Fallback email domain
                    "Incident Approved and Closed",
                    "Incident Resolution Approved",
                    "Your reported incident INC-" + String.format("%06d", incident.getId()) + " was approved.",
                    "Incident Title: <strong>" + incident.getTitle() + "</strong><br/>Resolution: " + incident.getResolutionSummary()
            );
        }
        if (incident.getAssignedTo() != null) {
            notificationService.send(new Notification("CLOSED", "Incident INC-" + String.format("%06d", incident.getId()) + " has been approved and closed.", incident.getAssignedTo()));
        }
        notificationService.send(new Notification("CLOSED", resolveMsg, "admin"));

        auditService.log(
                approvedByUser,
                "Incident Approved & Closed by Admin.",
                String.valueOf(id),
                incident.getTitle(),
                "PENDING_APPROVAL",
                "CLOSED",
                "127.0.0.1",
                adminRemarks != null ? adminRemarks : "Approved by Admin"
        );

        return savedIncident;
    }

    // ================= REJECT =================
    @PutMapping("/{id}/reject")
    public Incident rejectIncident(@PathVariable Long id, @RequestBody(required = false) Map<String, String> req) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return null;
        }

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String approver = auth != null ? auth.getName() : "Admin";

        String rejectionReason = req != null ? req.get("rejectionReason") : null;
        if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection reason is mandatory.");
        }
        String rejectedByUser = (req != null && req.get("rejectedBy") != null) ? req.get("rejectedBy") : approver;

        incident.setRejectionReason(rejectionReason);
        incident.setRejectedBy(rejectedByUser);
        incident.setRejectedAt(now());
        incident.setStatus("UNDER_INVESTIGATION");
        incident.setResolvedTime(null); // Clear resolved time since it is rejected and returned to analyst workflow
        incident.setUpdatedTime(now());
        updateSlaStatus(incident);
        Incident saved = service.save(incident);

        if (incident.getAssignedTo() != null) {
            User analyst = userRepository.findByUsername(incident.getAssignedTo()).orElse(null);
            if (analyst != null) {
                int reopenedCount = analyst.getReopenedIncidents() != null ? analyst.getReopenedIncidents() + 1 : 1;
                analyst.setReopenedIncidents(reopenedCount);
                userRepository.save(analyst);
                assignmentService.syncAnalystStats(analyst);
            }

            String rejectMsg = "Incident INC-" + String.format("%06d", incident.getId()) + " has been rejected by Admin. Please review and resubmit.";
            notificationService.send(new Notification("REASSIGNED", rejectMsg, incident.getAssignedTo()));

            emailService.sendIncidentNotification(
                    incident.getAssignedTo() + "@cybersoc.com",
                    "Incident Resolution Rejected",
                    "Resolution Rejected",
                    "Incident INC-" + String.format("%06d", incident.getId()) + " has been returned to investigation.",
                    "Rejection Reason: <strong>" + rejectionReason + "</strong>"
            );
        }
        notificationService.send(new Notification("STATUS_CHANGED", "Incident INC-" + String.format("%06d", incident.getId()) + " resolution has been rejected by Admin.", "admin"));

        auditService.log(
                rejectedByUser,
                "Incident Rejected by Admin.",
                String.valueOf(id),
                incident.getTitle(),
                "PENDING_APPROVAL",
                "UNDER_INVESTIGATION",
                "127.0.0.1",
                rejectionReason
        );

        return saved;
    }

    // ================= DELETE ACTIVE =================
    @DeleteMapping("/{id}")
    public String delete(@PathVariable Long id) {
        service.delete(id);
        return "Deleted Successfully";
    }

    // ================= ATTACHMENTS =================

    // 1. Upload
    @PostMapping("/{id}/attachments")
    public ResponseEntity<?> uploadAttachment(@PathVariable Long id, 
                                               @RequestParam("file") MultipartFile file,
                                               @RequestParam("username") String username) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return ResponseEntity.notFound().build();
        }

        // Security check: Only assigned analyst can upload if analyst, only reporter if employee, admins always can
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String currentUsername = auth.getName();
            java.util.Optional<User> userOpt = userRepository.findByUsername(currentUsername);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String role = user.getRole() != null ? user.getRole().toUpperCase() : "";
                if ("ANALYST".equals(role)) {
                    if (incident.getAssignedTo() == null || !incident.getAssignedTo().equalsIgnoreCase(currentUsername)) {
                        return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                                .body(Map.of("message", "Access denied. You are not the currently assigned analyst."));
                    }
                } else if ("EMPLOYEE".equals(role)) {
                    if (incident.getReportedBy() == null || !incident.getReportedBy().equalsIgnoreCase(currentUsername)) {
                        return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                                .body(Map.of("message", "Access denied. You do not own this incident."));
                    }
                }
            }
        }

        try {
            Attachment attachment = new Attachment();
            attachment.setIncidentId(id);
            attachment.setFilename(file.getOriginalFilename());
            attachment.setFileType(file.getContentType());
            attachment.setData(file.getBytes());
            attachment.setUploadedBy(username);
            attachment.setUploadTime(now());

            Attachment saved = attachmentRepository.save(attachment);
            return ResponseEntity.ok(Map.of(
                    "id", saved.getId(),
                    "filename", saved.getFilename(),
                    "fileType", saved.getFileType(),
                    "uploadedBy", saved.getUploadedBy(),
                    "uploadTime", saved.getUploadTime()
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to upload file"));
        }
    }

    // 2. List metadata
    @GetMapping("/{id}/attachments")
    public ResponseEntity<List<Map<String, Object>>> getAttachments(@PathVariable Long id) {
        List<Attachment> list = attachmentRepository.findByIncidentId(id);
        List<Map<String, Object>> result = list.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("filename", a.getFilename());
            map.put("fileType", a.getFileType());
            map.put("uploadedBy", a.getUploadedBy());
            map.put("uploadTime", a.getUploadTime());
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    // 3. Download / Preview
    @GetMapping("/attachments/{attachmentId}")
    public ResponseEntity<?> downloadAttachment(@PathVariable Long attachmentId) {
        com.cybersoc.model.Attachment attachment = attachmentRepository.findById(attachmentId).orElse(null);
        if (attachment == null || attachment.getData() == null || attachment.getData().length == 0) {
            return ResponseEntity.notFound().build();
        }

        // Fetch corresponding incident to enforce access control
        Incident incident = service.getByIdOrNull(attachment.getIncidentId());
        if (incident == null) {
            return ResponseEntity.status(403).body("Incident context not found.");
        }

        String authUsername = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        boolean isAdmin = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority()));
        boolean isAnalyst = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_ANALYST".equalsIgnoreCase(a.getAuthority()));

        boolean isOwner = authUsername != null && authUsername.equalsIgnoreCase(incident.getReportedBy());
        boolean isAssigned = authUsername != null && authUsername.equalsIgnoreCase(incident.getAssignedTo());

        if (!isAdmin && !isAnalyst && !isOwner) {
            if (!isAssigned) {
                return ResponseEntity.status(403).body("Access Denied. You do not have permission to download this attachment.");
            }
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(attachment.getFileType() != null ? attachment.getFileType() : "application/octet-stream"))
                .body(attachment.getData());
    }

    // ================= ESCALATION HISTORY =================
    @GetMapping("/{id}/escalations")
    public List<EscalationHistory> getEscalations(@PathVariable Long id) {
        return escalationHistoryRepository.findByIncidentId(id);
    }

    // ================= ASSIGNMENT HISTORY =================
    @GetMapping("/{id}/assignments")
    public List<com.cybersoc.model.AssignmentHistory> getAssignments(@PathVariable Long id) {
        return assignmentHistoryRepository.findByIncidentId(id);
    }

    // ================= AI INCIDENT SUMMARY GENERATOR =================
    private String generateAiSummary(String category, String description) {
        if (description == null) return "No description available.";
        String descLower = description.toLowerCase();
        String catLower = category != null ? category.toLowerCase() : "";

        if (descLower.contains("trojan") || descLower.contains("malware") || descLower.contains("virus") || descLower.contains("infect") || catLower.contains("malware")) {
            return "• Possible Malware Infection.\n• Device may still be compromised.\n• Immediate investigation recommended.";
        } else if (descLower.contains("phish") || descLower.contains("email") || descLower.contains("credential") || descLower.contains("social") || catLower.contains("phishing")) {
            return "• Possible Phishing or Social Engineering attempt.\n• Credentials or session tokens may be compromised.\n• Domain blocking and credential rotation recommended.";
        } else if (descLower.contains("ddos") || descLower.contains("scan") || descLower.contains("flood") || descLower.contains("network") || catLower.contains("network")) {
            return "• Suspicious Outbound or Inbound Network Traffic detected.\n• System may be undergoing port scanning or participating in DDoS.\n• Port isolation and traffic rate-limiting recommended.";
        } else if (descLower.contains("ransom") || descLower.contains("encrypt") || descLower.contains("bitcoin") || catLower.contains("ransomware")) {
            return "• Critical Ransomware Encryption threat.\n• Local storage or file shares may be actively encrypting.\n• Device isolation and immediate backup restoration protocol required.";
        } else if (descLower.contains("unauthorized") || descLower.contains("brute") || descLower.contains("hack") || descLower.contains("access") || catLower.contains("unauthorized")) {
            return "• Unauthorized Access or Brute-Force attempt.\n• Account credentials may be compromised.\n• Lock account and audit active sessions immediately.";
        } else if (descLower.contains("leak") || descLower.contains("breach") || descLower.contains("data") || catLower.contains("leak") || catLower.contains("breach")) {
            return "• Potential Data Breach or Data Leakage.\n• Sensitive company or customer data may be exposed.\n• Immediate audit of data access logs and network isolation recommended.";
        }
        
        return "• Security event of category [" + (category != null ? category : "General") + "] filed.\n• Potential security compliance exposure.\n• Analyst review and log assessment recommended.";
    }

    // ================= AI INVESTIGATION ASSISTANT =================
    @PostMapping("/{id}/ai-analysis")
    public ResponseEntity<?> generateAiAnalysis(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "false") boolean regenerate) {
        System.out.println("[DIAGNOSTICS] REST Endpoint entered: POST /api/incidents/" + id + "/ai-analysis");
        try {
            Incident incident = service.getByIdOrNull(id);
            if (incident == null) {
                System.out.println("[DIAGNOSTICS] Incident not found in MySQL for ID: " + id);
                return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                        .body(Map.of(
                                "success", false,
                                "stage", "Request Validation",
                                "exception", "ResponseStatusException",
                                "message", "No incident exists with ID: " + id,
                                "error", "Incident not found"
                        ));
            }
            System.out.println("[DIAGNOSTICS] Incident loaded successfully from MySQL.");
            System.out.println("[DIAGNOSTICS] Title: " + incident.getTitle());
            System.out.println("[DIAGNOSTICS] Category: " + incident.getCategory());
            System.out.println("[DIAGNOSTICS] Priority: " + incident.getPriority());
            System.out.println("[DIAGNOSTICS] Description length: " + (incident.getDescription() != null ? incident.getDescription().length() : "null"));

            if (incident.getDescription() == null || incident.getCategory() == null || incident.getTitle() == null || incident.getPriority() == null) {
                System.out.println("[DIAGNOSTICS] Validation failed: Some required fields are null.");
                return ResponseEntity.status(org.springframework.http.HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                                "success", false,
                                "stage", "Request Validation",
                                "exception", "IllegalArgumentException",
                                "message", "Required incident fields (Title, Category, Priority, Description) must not be null.",
                                "error", "Required incident fields must not be null"
                        ));
            }

            checkAuth(incident);

            // Check if AI Analysis is already stored in MySQL to avoid regenerating
            if (!regenerate && incident.getAiAssistantSummary() != null && !incident.getAiAssistantSummary().trim().isEmpty()) {
                System.out.println("Returning cached AI investigation from MySQL for incident id: " + id);
                return ResponseEntity.ok(incident);
            }

            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String currentUsername = auth != null ? auth.getName() : "System";

            String reporterDept = "Unknown";
            if (incident.getReportedBy() != null) {
                java.util.Optional<com.cybersoc.model.User> reporterOpt = userRepository.findByUsername(incident.getReportedBy());
                if (reporterOpt.isPresent() && reporterOpt.get().getDepartment() != null) {
                    reporterDept = reporterOpt.get().getDepartment();
                }
            }

            String assignedAnalyst = incident.getAssignedAnalystName() != null ? incident.getAssignedAnalystName() : "Unassigned";
            String analystNotes = incident.getAnalystNotes() != null ? incident.getAnalystNotes() : "No notes recorded.";
            String resolutionSummary = incident.getResolutionSummary() != null ? incident.getResolutionSummary() : "N/A";

            System.out.println("[DIAGNOSTICS] Calling Local Offline AI service...");
            Map<String, String> analysis = localAiInvestigationService.getAnalysis(
                    incident.getTitle(),
                    incident.getCategory(),
                    incident.getPriority(),
                    incident.getDescription(),
                    incident.getSource(),
                    reporterDept,
                    assignedAnalyst,
                    analystNotes,
                    resolutionSummary,
                    incident.getReportedBy()
            );
            System.out.println("[DIAGNOSTICS] Local Offline AI response generated successfully.");

            incident.setAiAssistantSummary(analysis.get("executiveSummary"));
            incident.setAiAssistantRootCause(analysis.get("possibleRootCause"));
            incident.setAiAssistantInvestigationSteps(analysis.get("investigationSteps"));
            incident.setAiAssistantContainmentActions(analysis.get("containmentRecommendations"));
            incident.setAiAssistantKeyIndicators(analysis.get("keyIndicators"));
            incident.setAiAssistantRecommendedResolution(analysis.get("businessImpact"));
            String riskLevel = analysis.get("riskLevel");
            String recPriority = "Medium";
            if (riskLevel != null) {
                String r = riskLevel.trim().toUpperCase();
                if ("LOW".equals(r)) recPriority = "Low";
                else if ("MEDIUM".equals(r)) recPriority = "Medium";
                else if ("HIGH".equals(r)) recPriority = "High";
                else if ("CRITICAL".equals(r)) recPriority = "Critical";
            }
            incident.setAiAssistantRiskLevel(riskLevel);
            incident.setRecommendedPriority(recPriority);

            String oldPriority = incident.getPriority();
            boolean priorityUpdated = false;
            if (aiPrioritySync && !recPriority.equalsIgnoreCase(oldPriority)) {
                incident.setPreviousPriority(oldPriority);
                incident.setPriority(recPriority);
                incident.setSlaDeadline(calculateSlaDeadline(recPriority));
                priorityUpdated = true;
            }
            incident.setAiAssistantConfidenceScore(analysis.get("confidenceScore"));
            incident.setAiAssistantGeneratedTime(java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

            Incident saved = service.save(incident);
            System.out.println("[DIAGNOSTICS] Incident AI fields saved successfully to MySQL database.");

            if (priorityUpdated) {
                auditService.log(
                        "AI Assistant",
                        "AI PRIORITY AUTO UPDATE",
                        String.valueOf(id),
                        incident.getTitle(),
                        oldPriority,
                        recPriority,
                        "127.0.0.1",
                        "AI Investigation completed. Risk Level: " + riskLevel + ". Priority automatically updated " + oldPriority + " → " + recPriority + ". Reason: AI Risk Level Synchronization"
                );
            }

            // Log activity log
            auditService.log(
                    currentUsername,
                    "GENERATED AI INVESTIGATION COMPLIANCE",
                    String.valueOf(id),
                    incident.getTitle(),
                    "N/A",
                    "Generated AI Analysis"
            );

            // Send WebSocket notification to alert page updates
            notificationService.send(new Notification("AI_ANALYSIS", "AI analysis generated for INC-" + String.format("%06d", incident.getId()), currentUsername));

            return ResponseEntity.ok(saved);
        } catch (com.cybersoc.service.AiExceptions.ApiKeyMissingException e) {
            System.err.println("[DIAGNOSTICS] ApiKeyMissingException thrown:");
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "stage", "API Key Validation",
                    "exception", e.getClass().getSimpleName(),
                    "message", "AI Configuration Error\nNo valid Gemini/OpenAI API key configured.",
                    "error", "AI Configuration Error\nNo valid Gemini/OpenAI API key configured."
            ));
        } catch (com.cybersoc.service.AiExceptions.InvalidApiKeyException e) {
            System.err.println("[DIAGNOSTICS] InvalidApiKeyException thrown:");
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "stage", "Authentication",
                    "exception", e.getClass().getSimpleName(),
                    "message", "AI Configuration Error\nNo valid Gemini/OpenAI API key configured.",
                    "error", "AI Configuration Error\nNo valid Gemini/OpenAI API key configured."
            ));
        } catch (com.cybersoc.service.AiExceptions.InvalidModelException e) {
            System.err.println("[DIAGNOSTICS] InvalidModelException thrown:");
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "stage", "Gemini HTTP Call",
                    "exception", e.getClass().getSimpleName(),
                    "message", "AI Investigation service is temporarily unavailable.",
                    "error", "AI Investigation service is temporarily unavailable."
            ));
        } catch (com.cybersoc.service.AiExceptions.InvalidRequestException e) {
            System.err.println("[DIAGNOSTICS] InvalidRequestException thrown:");
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "stage", "Gemini HTTP Call",
                    "exception", e.getClass().getSimpleName(),
                    "message", "AI Investigation service is temporarily unavailable.",
                    "error", "AI Investigation service is temporarily unavailable."
            ));
        } catch (com.cybersoc.service.AiExceptions.RateLimitExceededException e) {
            System.err.println("[DIAGNOSTICS] RateLimitExceededException thrown:");
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "stage", "Rate Limiting",
                    "exception", e.getClass().getSimpleName(),
                    "message", "AI quota exceeded.\nPlease try again later.",
                    "error", "AI quota exceeded.\nPlease try again later."
            ));
        } catch (com.cybersoc.service.AiExceptions.AiNetworkException e) {
            System.err.println("[DIAGNOSTICS] AiNetworkException thrown (AI provider is actually unavailable):");
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "stage", "Network Connection",
                    "exception", e.getClass().getSimpleName(),
                    "message", "Unable to contact AI provider.",
                    "error", "Unable to contact AI provider."
            ));
        } catch (com.cybersoc.service.AiExceptions.AiParsingException e) {
            System.err.println("[DIAGNOSTICS] AiParsingException thrown:");
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "stage", "JSON Parsing",
                    "exception", e.getClass().getSimpleName(),
                    "message", "AI Investigation service is temporarily unavailable.",
                    "error", "AI Investigation service is temporarily unavailable."
            ));
        } catch (Exception e) {
            System.err.println("[DIAGNOSTICS] Unexpected Exception thrown:");
            e.printStackTrace();
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "stage", "Unknown",
                    "exception", e.getClass().getSimpleName(),
                    "message", "AI Investigation service is temporarily unavailable.",
                    "error", "AI Investigation service is temporarily unavailable."
            ));
        }
    }

    private void checkAuth(Incident incident) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        String currentUsername = auth.getName();
        java.util.Optional<User> userOpt = userRepository.findByUsername(currentUsername);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String role = user.getRole() != null ? user.getRole().toUpperCase() : "";
            if ("ADMIN".equals(role)) {
                return; // Admins always authorized
            }
            if ("ANALYST".equals(role)) {
                if (incident.getAssignedTo() != null && incident.getAssignedTo().equalsIgnoreCase(currentUsername)) {
                    return; // Authorized if assigned to them!
                }
            }
        }
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied. Only the currently assigned analyst may modify active incidents.");
    }

    private boolean checkHasRelated(Incident incident) {
        if (incident == null) return false;
        long countActive = service.getAll().stream()
            .filter(i -> !java.util.Objects.equals(i.getId(), incident.getId()) &&
                         (java.util.Objects.equals(i.getCategory(), incident.getCategory()) ||
                          java.util.Objects.equals(i.getReportedBy(), incident.getReportedBy())))
            .count();
        if (countActive > 0) return true;

        long countResolved = resolvedIncidentRepository.findAll().stream()
            .filter(r -> !java.util.Objects.equals(r.getIncidentId(), incident.getId()) &&
                         (java.util.Objects.equals(r.getCategory(), incident.getCategory()) ||
                          java.util.Objects.equals(r.getReportedBy(), incident.getReportedBy())))
            .count();
        return countResolved > 0;
    }

    @PutMapping("/{id}/ai-recommendation")
    public ResponseEntity<Incident> updateAiRecommendation(
            @PathVariable Long id,
            @RequestBody Map<String, String> req) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return ResponseEntity.notFound().build();
        }

        String status = req.get("status"); // Approved, Rejected, Modified
        String reason = req.get("reason"); // rejection or modification reason

        incident.setAiRecommendationStatus(status);
        if ("Rejected".equalsIgnoreCase(status)) {
            incident.setAiRejectionReason(reason);
            auditService.log(
                getCurrentUsername(),
                "AI Recommendation Rejected",
                String.valueOf(id),
                incident.getTitle(),
                "Pending",
                "Rejected: " + (reason != null ? reason : "")
            );
        } else if ("Modified".equalsIgnoreCase(status)) {
            incident.setAiRejectionReason(reason);
            auditService.log(
                getCurrentUsername(),
                "AI Recommendation Modified",
                String.valueOf(id),
                incident.getTitle(),
                "Pending",
                "Modified: " + (reason != null ? reason : "")
            );
        } else {
            incident.setAiRecommendationStatus("Approved");
            auditService.log(
                getCurrentUsername(),
                "AI Recommendation Approved",
                String.valueOf(id),
                incident.getTitle(),
                "Pending",
                "Approved"
            );
        }

        Incident saved = service.save(incident);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/checklist")
    public ResponseEntity<Incident> updateChecklist(
            @PathVariable Long id,
            @RequestBody Map<String, String> req) {
        Incident incident = service.getByIdOrNull(id);
        if (incident == null) {
            return ResponseEntity.notFound().build();
        }

        String state = req.get("checklistState");
        incident.setChecklistState(state);

        auditService.log(
            getCurrentUsername(),
            "Checklist Updated",
            String.valueOf(id),
            incident.getTitle(),
            "Updated",
            "State updated"
        );

        Incident saved = service.save(incident);
        return ResponseEntity.ok(saved);
    }

    private void syncDescriptionDepartment(Incident incident) {
        if (incident == null || incident.getReportedBy() == null || incident.getDescription() == null) {
            return;
        }
        userRepository.findByUsername(incident.getReportedBy()).ifPresent(user -> {
            String dept = user.getDepartment();
            if (dept != null && !dept.trim().isEmpty()) {
                String desc = incident.getDescription();
                String syncedDesc = desc.replaceAll("(?i)Finance\\s+Department", dept + " Department")
                                        .replaceAll("(?i)Finance", dept);
                incident.setDescription(syncedDesc);
            }
        });
    }

    private String getCurrentUsername() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getName();
        }
        return "System";
    }
}