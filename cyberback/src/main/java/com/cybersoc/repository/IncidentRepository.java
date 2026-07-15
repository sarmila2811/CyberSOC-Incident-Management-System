package com.cybersoc.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cybersoc.model.Incident;
import java.util.List;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findByReportedBy(String reportedBy);
    List<Incident> findByAssignedTo(String assignedTo);
    long countByAssignedToAndStatusNot(String assignedTo, String status);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(i) FROM Incident i WHERE i.assignedTo = :assignedTo AND UPPER(i.status) IN ('OPEN', 'UNDER_INVESTIGATION', 'ESCALATED')")
    long countActiveWorkload(@org.springframework.data.repository.query.Param("assignedTo") String assignedTo);

    @org.springframework.data.jpa.repository.Query("SELECT i FROM Incident i WHERE UPPER(i.status) IN ('OPEN', 'UNDER_INVESTIGATION', 'ESCALATED')")
    List<Incident> findActiveIncidents();
}
