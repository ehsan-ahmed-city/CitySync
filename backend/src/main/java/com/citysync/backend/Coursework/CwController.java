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


    /**updates coursework under a specifc module for the user*/
    @PutMapping("/users/{userId}/modules/{moduleId}/coursework/{courseworkId}")
    public ResponseEntity<CourseworkResponse> update(
            @PathVariable Long userId,
            @PathVariable Long moduleId,
            @PathVariable Long courseworkId,
            @RequestBody UpdateCourseworkReq req
    ) {
        //check user exists
        if (!userRepo.existsById(userId)) {
            return ResponseEntity.notFound().build();
        }

        //check module exists and belongs to user
        Module module = moduleRepo.findById(moduleId).orElse(null);
        if (module == null || !module.getUser().getId().equals(userId)) {
            return ResponseEntity.notFound().build();
        }

        //check cw exists
        Coursework cw = cwRepo.findById(courseworkId).orElse(null);
        if (cw == null) {
            return ResponseEntity.notFound().build();
        }

        //check cw belongs to the same module
        if (!cw.getModule().getId().equals(moduleId)) {
            return ResponseEntity.notFound().build();
        }

        //check and apply updates
        if (req.title() != null) {
            if (req.title().isBlank()) return ResponseEntity.badRequest().build();
            cw.setTitle(req.title());
        }
        if (req.dueDate() != null) {
            cw.setDueDate(req.dueDate());
        }
        if (req.weighting() != null) {
            cw.setWeighting(req.weighting());
        }

        Coursework saved = cwRepo.save(cw);
        return ResponseEntity.ok(CourseworkResponse.from(saved));
    }


    /**deletes coursework under a specific module for the user */
    @DeleteMapping("/users/{userId}/modules/{moduleId}/coursework/{courseworkId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long userId,
            @PathVariable Long moduleId,
            @PathVariable Long courseworkId
    ) {
        //check user exists
        if (!userRepo.existsById(userId)) {
            return ResponseEntity.notFound().build();
        }

        //check module exists and belongs to this user
        Module module = moduleRepo.findById(moduleId).orElse(null);
        if (module == null || !module.getUser().getId().equals(userId)) {
            return ResponseEntity.notFound().build();
        }

        //sweing if cw exists and belongs to module
        Coursework cw = cwRepo.findById(courseworkId).orElse(null);
        if (cw == null || !cw.getModule().getId().equals(moduleId)) {
            return ResponseEntity.notFound().build();
        }

        cwRepo.delete(cw);
        return ResponseEntity.noContent().build();
    }


}

//request body JSON for create coursework
record CreateCourseworkReq(String title, LocalDate dueDate, Integer weighting) {}

record UpdateCourseworkReq(String title, LocalDate dueDate, Integer weighting) {}

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
