package com.citysync.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthCodeRepo extends JpaRepository<AuthCode, String> {
    //PK is email, findById for lookup
}
