package com.cybersoc;

import com.cybersoc.model.User;
import com.cybersoc.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@EnableScheduling
public class CybersocApplication {

    public static void main(String[] args) {
        SpringApplication.run(
            CybersocApplication.class,
            args
        );
    }

    @Bean
    public CommandLineRunner databaseSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Auto-encrypt any existing plain text passwords in the database
            for (User u : userRepository.findAll()) {
                if (u.getPassword() != null && !u.getPassword().startsWith("$2a$")) {
                    String plainText = u.getPassword();
                    u.setPassword(passwordEncoder.encode(plainText));
                    userRepository.save(u);
                    System.out.println("====== AUTO-ENCRYPTED USER PASSWORD ======");
                    System.out.println("Username: " + u.getUsername());
                    System.out.println("Plaintext was: " + plainText);
                    System.out.println("==========================================");
                }
            }

            if (userRepository.count() == 0) {
                // 1. Admin
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("Admin@123"));
                admin.setRole("ADMIN");
                admin.setEmail("admin@cybersoc.local");
                admin.setFullName("System Administrator");
                admin.setStatus("ACTIVE");
                admin.setDepartment("Security Operations");
                userRepository.save(admin);

                // 2. Analyst
                User analyst = new User();
                analyst.setUsername("analyst");
                analyst.setPassword(passwordEncoder.encode("Analyst@123"));
                analyst.setRole("ANALYST");
                analyst.setEmail("analyst@cybersoc.local");
                analyst.setFullName("Default SOC Analyst");
                analyst.setStatus("ACTIVE");
                analyst.setDepartment("Security Operations");
                analyst.setAnalystLevel("L1");
                analyst.setSpecialization("PHISHING");
                userRepository.save(analyst);

                // 3. Employee
                User employee = new User();
                employee.setUsername("employee");
                employee.setPassword(passwordEncoder.encode("Employee@123"));
                employee.setRole("EMPLOYEE");
                employee.setEmail("employee@cybersoc.local");
                employee.setFullName("Default Employee");
                employee.setStatus("ACTIVE");
                employee.setDepartment("Human Resources");
                userRepository.save(employee);

                System.out.println("====== SEEDED DEFAULT SOC USER ROLES ======");
                System.out.println("1. Admin: admin / Admin@123");
                System.out.println("2. Analyst: analyst / Analyst@123");
                System.out.println("3. Employee: employee / Employee@123");
                System.out.println("==========================================");
            }
        };
    }
}