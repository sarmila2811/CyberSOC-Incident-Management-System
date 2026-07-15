package com.cybersoc;

import com.cybersoc.model.Incident;
import com.cybersoc.model.ResolvedIncident;
import com.cybersoc.repository.IncidentRepository;
import com.cybersoc.repository.ResolvedIncidentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class IncidentWorkflowTests {

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private ResolvedIncidentRepository resolvedIncidentRepository;

    @Test
    void testEndToEndIncidentLifecycle() {
        // 1. Creation by Admin or report by Employee
        Incident incident = new Incident();
        incident.setTitle("Integration Testing Incident");
        incident.setCategory("Malware");
        incident.setPriority("Medium");
        incident.setDescription("Test description for integration workflow testing");
        incident.setReportedBy("employee");
        incident.setStatus("OPEN");
        incident.setCreatedTime("2026-07-07 12:00:00");
        
        Incident saved = incidentRepository.save(incident);
        assertNotNull(saved.getId());
        assertEquals("OPEN", saved.getStatus());
        assertEquals("2026-07-07 12:00:00", saved.getCreatedTime());

        // 2. Assignment to Analyst
        saved.setAssignedTo("analyst");
        saved.setAssignedAnalystName("SOC Analyst");
        saved.setAssignedTime("2026-07-07 12:15:00");
        saved.setStatus("UNDER_INVESTIGATION");
        Incident assigned = incidentRepository.save(saved);
        assertEquals("UNDER_INVESTIGATION", assigned.getStatus());
        assertEquals("2026-07-07 12:15:00", assigned.getAssignedTime());

        // 3. Escalation
        assigned.setStatus("ESCALATED");
        assigned.setEscalationLevel("L2");
        assigned.setEscalationTime("2026-07-07 12:30:00");
        Incident escalated = incidentRepository.save(assigned);
        assertEquals("ESCALATED", escalated.getStatus());
        assertEquals("2026-07-07 12:30:00", escalated.getEscalationTime());

        // 4. Submit for Approval (Resolution)
        escalated.setStatus("PENDING_ADMIN_APPROVAL");
        escalated.setResolutionSummary("Contained the virus and cleared logs");
        escalated.setResolvedTime("2026-07-07 13:00:00");
        Incident resolvedPending = incidentRepository.save(escalated);
        assertEquals("PENDING_ADMIN_APPROVAL", resolvedPending.getStatus());
        assertEquals("2026-07-07 13:00:00", resolvedPending.getResolvedTime());

        // 5. Admin rejection (Reopen)
        resolvedPending.setStatus("REOPENED");
        resolvedPending.setRejectionReason("Verify proxy logs as well.");
        resolvedPending.setResolvedTime(null);
        Incident reopened = incidentRepository.save(resolvedPending);
        assertEquals("REOPENED", reopened.getStatus());
        assertNull(reopened.getResolvedTime());
        assertEquals("Verify proxy logs as well.", reopened.getRejectionReason());

        // 6. Analyst submits again
        reopened.setStatus("PENDING_ADMIN_APPROVAL");
        reopened.setResolvedTime("2026-07-07 14:00:00");
        Incident resolvedPending2 = incidentRepository.save(reopened);

        // 7. Admin approval and Closure
        resolvedPending2.setStatus("CLOSED");
        resolvedPending2.setApprovalTime("2026-07-07 14:30:00");
        resolvedPending2.setClosedTime("2026-07-07 14:30:00");
        Incident closed = incidentRepository.save(resolvedPending2);
        assertEquals("CLOSED", closed.getStatus());

        // Save archive copy
        ResolvedIncident resolvedArchive = new ResolvedIncident();
        resolvedArchive.setIncidentId(closed.getId());
        resolvedArchive.setTitle(closed.getTitle());
        resolvedArchive.setCategory(closed.getCategory());
        resolvedArchive.setPriority(closed.getPriority());
        resolvedArchive.setAssignedAnalyst(closed.getAssignedTo());
        resolvedArchive.setApprovedBy("admin");
        resolvedArchive.setResolvedTime(closed.getResolvedTime());
        resolvedArchive.setResolutionSummary(closed.getResolutionSummary());
        resolvedArchive.setReportedBy(closed.getReportedBy());
        resolvedArchive.setCreatedTime(closed.getCreatedTime());
        resolvedArchive.setAssignedTime(closed.getAssignedTime());
        resolvedArchive.setEscalationTime(closed.getEscalationTime());
        resolvedArchive.setApprovalTime(closed.getApprovalTime());
        resolvedArchive.setClosedTime(closed.getClosedTime());

        ResolvedIncident savedArchive = resolvedIncidentRepository.save(resolvedArchive);
        assertNotNull(savedArchive.getId());
        assertEquals(closed.getId(), savedArchive.getIncidentId());
        assertEquals("2026-07-07 12:00:00", savedArchive.getCreatedTime());
        assertEquals("2026-07-07 12:15:00", savedArchive.getAssignedTime());
        assertEquals("2026-07-07 12:30:00", savedArchive.getEscalationTime());
        assertEquals("2026-07-07 14:00:00", savedArchive.getResolvedTime());
        assertEquals("2026-07-07 14:30:00", savedArchive.getApprovalTime());
        assertEquals("2026-07-07 14:30:00", savedArchive.getClosedTime());
    }
}
