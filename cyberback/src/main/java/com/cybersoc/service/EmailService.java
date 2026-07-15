package com.cybersoc.service;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.cybersoc.model.EmailLog;
import com.cybersoc.repository.EmailLogRepository;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailLogRepository emailLogRepository;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.host:}")
    private String mailHost;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.port:0}")
    private int mailPort;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:}")
    private String mailUsername;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.password:}")
    private String mailPassword;

    public EmailService(JavaMailSender mailSender, EmailLogRepository emailLogRepository) {
        this.mailSender = mailSender;
        this.emailLogRepository = emailLogRepository;
    }

    private void checkConfiguration() {
        if (mailHost == null || mailHost.trim().isEmpty()) {
            throw new IllegalStateException("SMTP Host configuration is missing (spring.mail.host).");
        }
        if (mailPort <= 0) {
            throw new IllegalStateException("SMTP Port configuration is missing or invalid (spring.mail.port).");
        }
        if (mailUsername == null || mailUsername.trim().isEmpty()) {
            throw new IllegalStateException("SMTP Username configuration is missing (spring.mail.username).");
        }
        if (mailPassword == null || mailPassword.trim().isEmpty()) {
            throw new IllegalStateException("SMTP Password configuration is missing (spring.mail.password).");
        }
    }

    public void sendEmail(String toEmail, String subject, String bodyHtml) {
        checkConfiguration();
        
        EmailLog log = new EmailLog();
        log.setRecipient(toEmail);
        log.setSubject(subject);
        log.setSentTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        System.out.println("[Email Workflow] Recipient email: " + toEmail);
        System.out.println("[SMTP Connection] Attempting SMTP connection to host: " + mailHost + ", port: " + mailPort);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(mailUsername);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(bodyHtml, true);

            mailSender.send(message);
            log.setStatus("Delivered");
            System.out.println("OTP email sent successfully");
        } catch (Exception e) {
            log.setStatus("Failed");
            log.setFailureReason(e.getMessage() != null ? e.getMessage() : e.toString());
            System.err.println("Failed to send email: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException(e);
        } finally {
            emailLogRepository.save(log);
        }
    }

    public void sendOtp(String toEmail, String otp) {
        String title = "OTP Verification Required";
        String heading = "Verify Your Account";
        String content = "Your random 6-digit One-Time Password (OTP) is: "
                + "<h2 style='color:#0d6efd;font-size:28px;letter-spacing:4px;margin:20px 0;'>" + otp + "</h2>"
                + "This OTP is valid for <strong>" + com.cybersoc.service.OtpService.OTP_EXPIRY_MINUTES + " minutes</strong>. If you did not request this code, please ignore this email.";
        
        String body = buildEmailTemplate(title, heading, content);
        sendEmail(toEmail, "CyberSOC - OTP Verification Required", body);
    }

    public void sendPasswordResetOtp(String toEmail, String otp) {
        String title = "Password Reset Request";
        String heading = "Reset Your Password";
        String content = "Your password reset One-Time Password (OTP) is: "
                + "<h2 style='color:#dc3545;font-size:28px;letter-spacing:4px;margin:20px 0;'>" + otp + "</h2>"
                + "This OTP is valid for <strong>" + com.cybersoc.service.OtpService.OTP_EXPIRY_MINUTES + " minutes</strong>. If you did not initiate this reset request, please secure your account immediately.";
        
        String body = buildEmailTemplate(title, heading, content);
        sendEmail(toEmail, "CyberSOC - Password Reset Request", body);
    }

    public void sendIncidentNotification(String toEmail, String subject, String title, String heading, String details) {
        String body = buildEmailTemplate(title, heading, details);
        sendEmail(toEmail, "CyberSOC Incident Alert: " + subject, body);
    }

    private String buildEmailTemplate(String title, String heading, String content) {
        return "<div style='font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e9ecef;border-radius:10px;background-color:#ffffff;'>"
                + "  <div style='text-align:center;padding-bottom:20px;border-bottom:1px solid #e9ecef;'>"
                + "    <h1 style='color:#0d6efd;font-size:24px;margin:0;font-weight:700;'>🔐 CyberSOC Enterprise</h1>"
                + "    <span style='color:#6c757d;font-size:12px;text-transform:uppercase;letter-spacing:1px;'>Security Operations Center</span>"
                + "  </div>"
                + "  <div style='padding:20px 0;'>"
                + "    <h2 style='color:#212529;font-size:20px;margin-top:0;'>" + heading + "</h2>"
                + "    <div style='color:#495057;font-size:15px;line-height:1.6;'>" + content + "</div>"
                + "  </div>"
                + "  <div style='padding-top:20px;border-top:1px solid #e9ecef;color:#868e96;font-size:12px;text-align:center;line-height:1.5;'>"
                + "    <p style='margin:0;'>This email is an automated system notification from your CyberSOC enterprise server.</p>"
                + "    <p style='margin:5px 0 0;'>For urgent support, contact security-ops@cybersoc.com.</p>"
                + "  </div>"
                + "</div>";
    }
}