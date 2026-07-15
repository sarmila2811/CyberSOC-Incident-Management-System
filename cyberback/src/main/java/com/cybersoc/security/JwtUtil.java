package com.cybersoc.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.util.Date;

public class JwtUtil {

    private static final Key SECRET_KEY =
            Keys.hmacShaKeyFor(
                    "cybersocsecretkeycybersocsecretkey12345".getBytes()
            );

    // GENERATE TOKEN
    public static String generateToken(String username) {
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + (1000L * 60 * 60 * 24) // 24 hours
                        )
                )
                .signWith(SECRET_KEY)
                .compact();
    }

    // EXTRACT CLAIMS
    public static Claims getClaims(String token) {
        return Jwts.parser()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // EXTRACT USERNAME
    public static String extractUsername(String token) {
        return getClaims(token).getSubject();
    }

    // VALIDATE TOKEN
    public static boolean validateToken(String token, String username) {
        try {
            Claims claims = getClaims(token);
            boolean isExpired = claims.getExpiration().before(new Date());
            return (claims.getSubject().equals(username) && !isExpired);
        } catch (Exception e) {
            return false;
        }
    }

    // VALIDATE WITHOUT USERNAME (Check Expiry and Signature)
    public static boolean validateToken(String token) {
        try {
            Claims claims = getClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}