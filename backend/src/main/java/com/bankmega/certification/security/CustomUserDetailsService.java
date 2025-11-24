package com.bankmega.certification.security;

import com.bankmega.certification.entity.User;
import com.bankmega.certification.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsernameWithRoleAndDeletedAtIsNull(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return new UserPrincipal(user);
    }
}
