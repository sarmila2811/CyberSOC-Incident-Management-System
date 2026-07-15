package com.cybersoc.service;

import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.cybersoc.model.User;
import com.cybersoc.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // GET ALL USERS
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // FIND BY USERNAME
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    // FIND BY EMAIL
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // REGISTER
    public User register(User user) {
        Optional<User> existing = userRepository.findByUsername(user.getUsername());
        if (existing.isPresent()) {
            return null;
        }
        
        // Encrypt password using BCrypt
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        if (user.getStatus() == null) {
            user.setStatus("ACTIVE");
        }
        
        return userRepository.save(user);
    }

    // LOGIN
    public User login(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Only active users can log in
            if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
                return null;
            }

            if (passwordEncoder.matches(password, user.getPassword())) {
                return user;
            }
        }

        return null;
    }

    // UPDATE USER
    public User save(User user) {
        return userRepository.save(user);
    }

    // DELETE USER
    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    // GET BY ID OR NULL
    public User getById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
}