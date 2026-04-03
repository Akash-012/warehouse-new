package com.warehouse.wms.controller;

import com.warehouse.wms.dto.AuthRequest;
import com.warehouse.wms.dto.AuthResponse;
import com.warehouse.wms.dto.RegisterRequest;
import com.warehouse.wms.entity.User;
import com.warehouse.wms.repository.UserRepository;
import com.warehouse.wms.service.JwtService;
import com.warehouse.wms.service.RoleService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final RoleService roleService;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository,
                          JwtService jwtService, PasswordEncoder passwordEncoder, RoleService roleService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.roleService = roleService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
        final User user = userRepository.findByUsername(request.getUsername()).orElseThrow();
        final String token = jwtService.generateToken(user);

        var permissions = user.getRole().getPermissions().stream()
                .map(Enum::name)
                .collect(Collectors.toList());

        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getRole().getName(), permissions));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(roleService.findByNameOrThrow(request.getRole()));
        userRepository.save(user);

        final String token = jwtService.generateToken(user);
        var permissions = user.getRole().getPermissions().stream()
                .map(Enum::name)
                .collect(Collectors.toList());

        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getRole().getName(), permissions));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        var permissions = user.getRole().getPermissions().stream()
                .map(Enum::name)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "role", user.getRole().getName(),
                "permissions", permissions
        ));
    }

    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> changePassword(@RequestBody Map<String, String> request,
                                                               Authentication authentication) {
        String currentPassword = request.getOrDefault("currentPassword", "");
        String newPassword = request.getOrDefault("newPassword", "");

        if (currentPassword.isBlank() || newPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "currentPassword and newPassword are required");
        }
        if (newPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}
