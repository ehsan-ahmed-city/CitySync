package com.citysync.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface AuthCodeRepo extends JpaRepository<AuthCode, String> {
    //PK is email, findById for lookup
    Optional<AuthCode> findEmailPurpose(String email, String purpose);

    void deleteEmailPurp(String email, String purpose);

    void deleteEmail(String email);
}
