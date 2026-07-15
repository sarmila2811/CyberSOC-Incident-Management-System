package com.cybersoc.dto;

public class AuthResponse {

    private Long id;
    private String username;
    private String role;
    private String token;

    public AuthResponse(
            Long id,
            String username,
            String role,
            String token) {

        this.id = id;
        this.username = username;
        this.role = role;
        this.token = token;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }

    public String getToken() {
        return token;
    }
}