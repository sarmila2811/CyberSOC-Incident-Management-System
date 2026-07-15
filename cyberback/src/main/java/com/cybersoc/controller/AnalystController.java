package com.cybersoc.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.cybersoc.model.User;
import com.cybersoc.repository.UserRepository;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api/analysts")
public class AnalystController {

    private final UserRepository userRepository;

    public AnalystController(
            UserRepository userRepository
    ) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<User> getAllAnalysts() {

        return userRepository.findByRole("ANALYST");
    }
}