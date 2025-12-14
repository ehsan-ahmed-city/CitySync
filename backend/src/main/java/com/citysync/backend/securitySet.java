package com.citysync.backend;
import org.springframework.context.annotation.Bean;//mark methods that produce beans
import org.springframework.context.annotation.Configuration;//makes class configuration for spring
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class securitySet {

    @Bean //security filter chain in spring container
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())//for api and postman
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())//just for now no authentication
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());//turn off auth popups
        return http.build();//returns filter chain
    }

}
