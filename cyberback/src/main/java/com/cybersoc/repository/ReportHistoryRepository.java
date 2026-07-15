package com.cybersoc.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.cybersoc.model.ReportHistory;

@Repository
public interface ReportHistoryRepository extends JpaRepository<ReportHistory, Long> {
}
