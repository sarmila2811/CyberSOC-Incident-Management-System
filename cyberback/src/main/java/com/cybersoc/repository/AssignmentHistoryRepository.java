package com.cybersoc.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import com.cybersoc.model.AssignmentHistory;

public interface AssignmentHistoryRepository extends JpaRepository<AssignmentHistory, Long> {
    List<AssignmentHistory> findByIncidentId(Long incidentId);
}
