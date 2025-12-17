package com.bankmega.certification.security;

import com.bankmega.certification.entity.Role;
import com.bankmega.certification.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class UserPrincipal implements UserDetails {

    @com.fasterxml.jackson.annotation.JsonIgnore
    private final User user;

    private final Long id;
    private final Long employeeId;

    private final String username;
    private final String password;
    private final String email;
    private final Role role;
    private final Boolean isActive;

    public UserPrincipal(User user) {
        this.user = user;
        this.id = user.getId();
        this.username = user.getUsername();
        this.password = user.getPassword();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.isActive = user.getIsActive();

        // 🔥 Ambil employeeId dari relasi User → Employee
        this.employeeId = user.getEmployee() != null ? user.getEmployee().getId() : null;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (role != null) {
            return List.of(new SimpleGrantedAuthority("ROLE_" + role.getName()));
        }
        return List.of();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return Boolean.TRUE.equals(isActive);
    }
}
