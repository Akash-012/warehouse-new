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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

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
}
