package com.cybersoc.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cybersoc.model.User;

@Repository
public interface UserRepository
extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    List<User> findByRole(String role);
    List<User> findBySpecializationAndAnalystLevel(
            String specialization,
            String analystLevel
    );
}