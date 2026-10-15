package com.martin95am.backend;

import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class LoopEmailDelivery {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String recipient;
    private String filename;
    private Instant sentAt;

    protected LoopEmailDelivery() { }

    public LoopEmailDelivery(String recipient, String filename) {
        this.recipient = recipient;
        this.filename = filename;
        this.sentAt = Instant.now();
    }
}
