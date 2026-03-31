package com.citysync.backend.auth;

import java.io.Serializable;
import java.util.Objects;

//comp key for authcode email +purpose
public class AuthCodeId implements Serializable {

    private String email;
    private String purpose;

    public AuthCodeId() {}

    public AuthCodeId(String email, String purpose) {
        this.email = email;
        this.purpose = purpose;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuthCodeId that)) return false;
        return Objects.equals(email, that.email) && Objects.equals(purpose, that.purpose);
    }

    @Override
    public int hashCode() {
        return Objects.hash(email, purpose);
    }
}