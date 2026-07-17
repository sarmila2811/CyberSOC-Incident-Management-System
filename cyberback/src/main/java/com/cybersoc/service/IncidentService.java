package com.cybersoc.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.cybersoc.model.Incident;
import com.cybersoc.repository.IncidentRepository;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;

    public IncidentService(IncidentRepository incidentRepository) {
        this.incidentRepository = incidentRepository;
    }

    public List<Incident> getAll() {
        return incidentRepository.findAll();
    }

    public List<Incident> findActiveIncidents() {
        return incidentRepository.findActiveIncidents();
    }

    public Incident save(Incident incident) {
        return incidentRepository.save(incident);
    }

    public Incident getByIdOrNull(Long id) {
        return incidentRepository.findById(id).orElse(null);
    }

    public void delete(Long id) {
        incidentRepository.deleteById(id);
    }

    public List<Incident> getMyIncidents(String username) {
        return incidentRepository.findByAssignedTo(username);
    }

    public List<Incident> getIncidentsForAdmin() {
        return incidentRepository.findAll();
    }

    public List<Incident> getIncidentsForAnalyst(String username) {
        return incidentRepository.findByAssignedTo(username);
    }

    public List<Incident> getIncidentsForEmployee(String username) {
        return incidentRepository.findByReportedBy(username);
    }
}