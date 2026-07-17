package com.cybersoc.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cybersoc.model.ResolvedIncident;

@Repository
public interface ResolvedIncidentRepository extends JpaRepository<ResolvedIncident, Long> {
    long countByAssignedAnalyst(String assignedAnalyst);
    java.util.List<ResolvedIncident> findByAssignedAnalyst(String assignedAnalyst);
    java.util.List<ResolvedIncident> findByReportedBy(String reportedBy);
}
