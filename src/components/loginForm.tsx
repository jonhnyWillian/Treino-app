"use client";

import { useState } from "react";
import {
  TextField,
  Button,
  Stack,
  Typography,
  Paper,
  Box,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useRouter } from "next/navigation";

type Errors = {
  email?: string;
  senha?: string;
};

export default function LoginForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    senha: "",
  });

  type FormState = typeof form;
  type FormField = keyof FormState;

  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = (field: FormField, value: string) => {
    setApiError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const newErrors: Errors = {};

    if (!form.email) newErrors.email = "Email obrigatório";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      newErrors.email = "Email inválido";
    if (!form.senha) newErrors.senha = "Senha obrigatória";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const resposta = await fetch(`${baseUrl}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setApiError(dados?.message || "Login inválido");
        return;
      }

      if (dados.token) {
        localStorage.setItem("token", dados.token);
      }
      localStorage.setItem("usuario", JSON.stringify(dados.usuario));
      router.push("/perfil");
    } catch (error) {
      console.error(error);
      setApiError("Erro ao conectar com servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "#0f172a",
        px: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 4,
        }}
      >
        <Stack
          component="form"
          spacing={2.5}
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) void handleSubmit();
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            textAlign="center"
          >
            Login 🔐
          </Typography>

          {apiError ? <Alert severity="error">{apiError}</Alert> : null}

          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
            fullWidth
          />

          <TextField
            label="Senha"
            type={showPassword ? "text" : "password"}
            value={form.senha}
            onChange={(e) => handleChange("senha", e.target.value)}
            error={!!errors.senha}
            helperText={errors.senha}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="contained"
            type="submit"
            fullWidth
            disabled={loading}
            sx={{
              py: 1.5,
              fontWeight: "bold",
              borderRadius: 3,
              background: "linear-gradient(45deg, #22c55e, #4ade80)",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}