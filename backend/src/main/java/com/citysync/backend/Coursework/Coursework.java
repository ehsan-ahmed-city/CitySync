package com.citysync.backend.coursework;

import com.citysync.backend.module.Module;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "coursework")
public class Coursework {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //many coursework items can belong to one module like many to one relatsonship
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;

    @Column(nullable = false)
    private String title; //like "PDD submission"


    @Column(nullable = false)
    private LocalDate dueDate;  //submission date for planning

    //weighting (0-100% of module) optional but helps students
    private Integer weighting;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();//when it was created

    protected Coursework() {
        // jpa needs a constructore with no args
    }

    public Coursework(Module module, String title, LocalDate dueDate, Integer weighting) {
        this.module = module;
        this.title = title;
        this.dueDate = dueDate;
        this.weighting = weighting;
    }

    //getters
    public Long getId() { return id; }
    public Module getModule() { return module; }
    public String getTitle() { return title; }
    public LocalDate getDueDate() { return dueDate; }
    public Integer getWeighting() { return weighting; }
    public Instant getCreatedAt() { return createdAt; }
}
