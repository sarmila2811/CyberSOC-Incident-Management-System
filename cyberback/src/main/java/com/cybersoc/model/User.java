package com.cybersoc.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    private String role; // ADMIN, ANALYST, EMPLOYEE
    
    @Column(unique = true, nullable = false)
    private String email;
    
    private String fullName;
    private String phone;
    private String department;
    
    @Column(columnDefinition = "LONGTEXT")
    private String profileImage;
    
    private String status = "ACTIVE"; // ACTIVE, INACTIVE
    private String lastLogin;
    private String analystLevel; // L1, L2
    private String specialization; // PHISHING, MALWARE, NETWORK, RANSOMWARE
    private Integer resolvedCount = 0;
    private String lastAssignmentTime;
    private Integer totalAssignedIncidents = 0;
    private Integer resolvedIncidents = 0;
    private Integer escalatedIncidents = 0;
    private Integer reopenedIncidents = 0;
    private Double performanceScore = 0.0;
    private String createdDate;
    private String updatedDate;
    private Boolean forcePasswordChange = false;

    @PrePersist
    protected void onCreate() {
        createdDate = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
        updatedDate = createdDate;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedDate = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
    }

    public User() {
    }

    public User(Long id, String username, String password, String role, String email) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.role = role;
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getProfileImage() {
        return profileImage;
    }

    public void setProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getLastLogin() {
        return lastLogin;
    }

    public void setLastLogin(String lastLogin) {
        this.lastLogin = lastLogin;
    }

    public String getAnalystLevel() {
        return analystLevel;
    }

    public void setAnalystLevel(String analystLevel) {
        this.analystLevel = analystLevel;
    }

    public String getSpecialization() {
        return specialization;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public Integer getResolvedCount() {
        return resolvedCount;
    }

    public void setResolvedCount(Integer resolvedCount) {
        this.resolvedCount = resolvedCount;
    }

    public String getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(String createdDate) {
        this.createdDate = createdDate;
    }

    public String getUpdatedDate() {
        return updatedDate;
    }

    public void setUpdatedDate(String updatedDate) {
        this.updatedDate = updatedDate;
    }

    public Boolean getForcePasswordChange() {
        return forcePasswordChange;
    }

    public void setForcePasswordChange(Boolean forcePasswordChange) {
        this.forcePasswordChange = forcePasswordChange;
    }

    public String getLastAssignmentTime() {
        return lastAssignmentTime;
    }

    public void setLastAssignmentTime(String lastAssignmentTime) {
        this.lastAssignmentTime = lastAssignmentTime;
    }

    public Integer getTotalAssignedIncidents() {
        return totalAssignedIncidents;
    }

    public void setTotalAssignedIncidents(Integer totalAssignedIncidents) {
        this.totalAssignedIncidents = totalAssignedIncidents;
    }

    public Integer getResolvedIncidents() {
        return resolvedIncidents;
    }

    public void setResolvedIncidents(Integer resolvedIncidents) {
        this.resolvedIncidents = resolvedIncidents;
    }

    public Integer getEscalatedIncidents() {
        return escalatedIncidents;
    }

    public void setEscalatedIncidents(Integer escalatedIncidents) {
        this.escalatedIncidents = escalatedIncidents;
    }

    public Integer getReopenedIncidents() {
        return reopenedIncidents;
    }

    public void setReopenedIncidents(Integer reopenedIncidents) {
        this.reopenedIncidents = reopenedIncidents;
    }

    public Double getPerformanceScore() {
        return performanceScore;
    }

    public void setPerformanceScore(Double performanceScore) {
        this.performanceScore = performanceScore;
    }
}