package com.citysync.backend.module;

import com.citysync.backend.user.User;
import com.citysync.backend.user.UserRepo;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users/{userId}/modules")
public class ModuleController{

    private final UserRepo userRepo;
    private final ModuleRepository moduleRepo;
    //gets the user and module table for creaion or fetching

    public ModuleController(UserRepo userRepo, ModuleRepository moduleRepo){
        //constructor with user and module table as args
        this.userRepo = userRepo;
        this.moduleRepo = moduleRepo;
    }


    
}

