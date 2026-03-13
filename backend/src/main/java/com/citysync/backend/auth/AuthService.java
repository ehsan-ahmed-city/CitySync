package com.citysync.backend.auth;

import com.citysync.backend.user.User;
import com.citysync.backend.user.UserRepo;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {

    private final AuthCodeRepo  codeRepo;
    private final UserRepo      userRepo;
    private final JavaMailSender mailSender;

    //sender address need match spring.mail.username in app properties
    private static final String FROM_ADDRESS = "ehsanahmed828@gmail.com";
    private static final int    CODE_EXPIRY_MINUTES = 10;

    public AuthService(AuthCodeRepo codeRepo, UserRepo userRepo, JavaMailSender mailSender) {
        this.codeRepo   = codeRepo;
        this.userRepo   = userRepo;
        this.mailSender = mailSender;
    }

    /**generates  6 digit code, saves/replaces it in auth_codes and emails it
     * if email new, user row is also created so app has userId*/
    public void requestCode(String email) {
        // Create user row if first time
        if (!userRepo.existsByEmail(email)) {
            User u = new User();
            u.setEmail(email);
            userRepo.save(u);
        }

        //generate 6 digit code
        String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));//zero-padded

        AuthCode ac = new AuthCode(email, code, Instant.now().plus(CODE_EXPIRY_MINUTES, ChronoUnit.MINUTES)); //upsert replace any existing for this email
        codeRepo.save(ac);

        //log console debug
        System.out.printf("[CitySync Auth] Code for %s → %s%n", email, code);

        //send email
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(FROM_ADDRESS);
        msg.setTo(email);
        msg.setSubject("Your CitySync verification code");
        msg.setText(

            "Hi!!,\n\n" +
            "Your CitySync verification code is:\n\n" +
            "    " + code + "\n\n" +
            "This code expires in " + CODE_EXPIRY_MINUTES + " minutes.\n\n" +
            "If you did not request this, please ignore this email.\n\n" +
            "– CitySync"
        );
        System.out.println("[CitySync Auth] attempting to send email to: " + email);
        mailSender.send(msg);
    }

    /**verifies the code, returns the userId on success else throws on failure.
     */
    public long verifyCode(String email, String code) {

        AuthCode ac = codeRepo.findById(email)
            .orElseThrow(() -> new IllegalArgumentException("no code found for this email. Please request a new one."));

        if (Instant.now().isAfter(ac.getExpiresAt())) {

            codeRepo.deleteById(email);
            throw new IllegalArgumentException("code expired, pls request a new one.");
        }

        if (!ac.getCode().equals(code)) {
            throw new IllegalArgumentException("Incorrect code. Please try again.");
        }

        //clean up used code
        codeRepo.deleteById(email);

        return userRepo.findByEmail(email) //return the userId
            .orElseThrow(() -> new IllegalStateException("User not found after verification.")).getId();
    }
}
