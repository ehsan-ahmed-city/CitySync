package com.citysync.backend.coursework;
import com.citysync.backend.module.Module;
import com.citysync.backend.module.ModuleRepository;
import com.citysync.backend.user.UserRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
@RestController
public class CwController {

    private final UserRepo userRepo;
    private final ModuleRepository moduleRepo;
    private final CwRepo cwRepo;

    public CwController(UserRepo userRepo, ModuleRepository moduleRepo, CwRepo cwRepo) {
        this.userRepo = userRepo;
        this.moduleRepo = moduleRepo;
        this.cwRepo = cwRepo;
    }



}
