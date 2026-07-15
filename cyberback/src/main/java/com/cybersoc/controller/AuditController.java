package com.cybersoc.controller;

import com.cybersoc.model.AuditLog;
import com.cybersoc.service.AuditService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@CrossOrigin(origins = "http://localhost:3000")
public class AuditController {

    private final AuditService service;

    public AuditController(AuditService service) {
        this.service = service;
    }

    @GetMapping
    public List<AuditLog> getLogs() {
        return service.getAllLogs();
    }

    @GetMapping("/incident/{incidentId}")
    public List<AuditLog> getLogsByIncident(@PathVariable String incidentId) {
        return service.getLogsByIncident(incidentId);
    }
}