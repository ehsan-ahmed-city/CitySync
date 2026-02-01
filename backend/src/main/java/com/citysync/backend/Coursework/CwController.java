package com.citysync.backend.coursework;

import com.citysync.backend.module.Module;
import com.citysync.backend.module.ModuleRepository;
import com.citysync.backend.user.UserRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

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

    /** get /users/{userId}/coursework
     * lists all coursework for a user across all modules */
    @GetMapping("/users/{userId}/coursework")
    public ResponseEntity<java.util.List<CourseworkResponse>> listForUser(@PathVariable Long userId) {

        if (!userRepo.existsById(userId)) {
            return ResponseEntity.notFound().build();
        }

        var items = cwRepo.findByModuleUserId(userId)
                .stream()
                .map(CourseworkResponse::from)
                .toList();

        return ResponseEntity.ok(items);
    }


    /** post/users/{ userId}/modules/{moduleId}/coursework
     * creates coursework under specific module for user*/
    @PostMapping("/users/{userId}/modules/{moduleId}/coursework")
    public ResponseEntity<CourseworkResponse> create(
            @PathVariable Long userId,
            @PathVariable Long moduleId,
            @RequestBody CreateCourseworkReq req
    ) {

        if (!userRepo.existsById(userId)) {//checks user exists
            return ResponseEntity.notFound().build();
        }

        Module module = moduleRepo.findById(moduleId).orElse(null);
        if (module == null || !module.getUser().getId().equals(userId)) {//ensure module exists and belongs to user
            return ResponseEntity.notFound().build();
        }

        if (req.title() == null || req.title().isBlank() || req.dueDate() == null) {//validate request body (title + dueDate )
            return ResponseEntity.badRequest().build();
        }

        //save coursework linked to the module
        Coursework saved = cwRepo.save(
                new Coursework(module, req.title(), req.dueDate(), req.weighting())
        );

        return ResponseEntity.ok(CourseworkResponse.from(saved));//return DTO response
    }
}

//request body JSON for create coursework
record CreateCourseworkReq(String title, LocalDate dueDate, Integer weighting) {}

/**
 * response DTO returned to the client
 * keeps response small by not returning full module/user objects*/
record CourseworkResponse(
        Long id,
        Long moduleId,
        Long userId,
        String title,
        LocalDate dueDate,
        Integer weighting
) {
    static CourseworkResponse from(Coursework c) {
        return new CourseworkResponse(
                c.getId(),
                c.getModule().getId(),
                c.getModule().getUser().getId(),
                c.getTitle(),
                c.getDueDate(),
                c.getWeighting()
        );
    }
}

