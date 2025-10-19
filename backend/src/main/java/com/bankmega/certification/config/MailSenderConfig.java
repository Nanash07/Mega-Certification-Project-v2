package com.bankmega.certification.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import com.bankmega.certification.service.EmailConfigService;
import com.bankmega.certification.entity.EmailConfig;
import com.bankmega.certification.security.AESUtil;

import java.util.Properties;

@Configuration
public class MailSenderConfig {

    @Bean
    public JavaMailSenderImpl reusableMailSender(EmailConfigService emailConfigService) {
        EmailConfig config = emailConfigService.getActiveConfigEntity();

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(config.getHost());
        mailSender.setPort(config.getPort());
        mailSender.setUsername(config.getUsername());
        mailSender.setPassword(AESUtil.decrypt(config.getPassword()));

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", String.valueOf(config.getUseTls()));
        props.put("mail.smtp.ssl.trust", config.getHost());
        props.put("mail.smtp.connectiontimeout", 10000);
        props.put("mail.smtp.timeout", 10000);
        props.put("mail.smtp.writetimeout", 10000);

        return mailSender;
    }
}
