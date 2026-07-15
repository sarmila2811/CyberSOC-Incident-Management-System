package com.cybersoc.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cybersoc.model.EscalationHistory;
import java.util.List;

@Repository
public interface EscalationHistoryRepository extends JpaRepository<EscalationHistory, Long> {
    List<EscalationHistory> findByIncidentId(Long incidentId);
}
