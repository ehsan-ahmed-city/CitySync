package com.citysync.backend.module;

import com.citysync.backend.user.User;
import com.citysync.backend.user.UserRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.list;

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

    /**creating a new module for a specific user */

    @PostMapping
    public ResponseEntity<ModuleResponse> create (
        @PathVariable Long userId, //takes user ID from URL
        @RequestBody createModuleReq req //the json body is mapped to a javarecord

    ){
        User user = userRepo.findById(userId).orElse(null);
        //check whether the parent user exists

        if(user == null){
            return ResponseEntity.notFound().build();//if the user does not exist return 404
        }


        if (req.code() == null || req.code().isBlank()|| req.name() == null || req.name().isBlank()) {
            return ResponseEntity.badRequest().build();    //prevents empty/kinda empty modules being saved
        }


        Module saved = moduleRepo.save( //create a new module entity and associate it with the user
            new Module(user, req.code(), req.name(), req.credits())
        );

        /** converts entity to DTO before returning
        * so it avoids returning full User object inside module*/
        @GetMapping
        return ResponseEntity.ok(ModuleResponse.from(saved));
    }

    /**list all modules for specific user
    * and HTTP: Get /users/{userId}/modules*/    
    @GetMapping
    public ResponseEntity<List<ModuleResponse>> list(
            @PathVariable Long userId
    ) {

        if (!userRepo.existsById(userId)) {
            return ResponseEntity.notFound().build(); //if user doesn't exist return 404
        }


        List<ModuleResponse> modules =  //ftechs modules that belong to this user
                moduleRepo.findByUserId(userId) //findByUserId generates SQL
                        .stream() //stream/map converts entities to dtos
                        .map(ModuleResponse::from)
                        .toList();//returns immutable list

        return ResponseEntity.ok(modules);
    }    

    
}

//request body json for create:  {"code":"IN3001","name":"Cool Module","credits":15}
record CreateModuleRequest(String code, String name, Integer credits) {}

record ModuleResponse(Long id, Long userId, String code, String name, Integer credits) {
    static ModuleResponse from(Module m) {
        return new ModuleResponse(//response DTO (prevent full User object inside Module)
                m.getId(),
                m.getUser().getId(),
                m.getCode(),
                m.getName(),
                m.getCredits()
        );
    }
}
