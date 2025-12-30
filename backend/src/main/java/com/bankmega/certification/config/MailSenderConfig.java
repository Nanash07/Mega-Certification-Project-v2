package com.bankmega.certification.config;

import com.bankmega.certification.entity.EmailConfig;
import com.bankmega.certification.security.AESUtil;
import com.bankmega.certification.service.EmailConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
@RequiredArgsConstructor
public class MailSenderConfig {

    private final EmailConfigService emailConfigService;

    @Bean
    public JavaMailSender reusableMailSender() {
        EmailConfig config = emailConfigService.getActiveConfigEntity();
        if (config == null) {
            throw new IllegalStateException("Tidak ada konfigurasi email aktif di database!");
        }

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(config.getHost());
        mailSender.setPort(config.getPort());
        mailSender.setUsername(config.getUsername());
        mailSender.setPassword(AESUtil.decrypt(config.getPassword()));

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");

        if (Boolean.TRUE.equals(config.getUseTls())) {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.ssl.enable", "false");
        } else {
            props.put("mail.smtp.ssl.enable", "true");
            props.put("mail.smtp.starttls.enable", "false");
        }

        props.put("mail.smtp.ssl.trust", config.getHost());
        props.put("mail.smtp.connectiontimeout", 30000);
        props.put("mail.smtp.timeout", 30000);
        props.put("mail.smtp.writetimeout", 30000);

        return mailSender;
    }
}
