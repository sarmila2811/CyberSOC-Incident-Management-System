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
    public List<AuditLog> getLogs(@RequestParam(required = false) Integer limit) {
        List<AuditLog> logs = service.getAllLogs();
        if (limit != null && limit > 0 && limit < logs.size()) {
            return logs.subList(0, limit);
        }
        return logs;
    }

    @GetMapping("/incident/{incidentId}")
    public List<AuditLog> getLogsByIncident(@PathVariable String incidentId) {
        return service.getLogsByIncident(incidentId);
    }
}