import React, { useState } from "react";
import {
  Box, Container, Paper, TextField, Button, Typography, Stack, Alert, CircularProgress,
} from "@mui/material";
import { useHistory, Link as RouterLink } from "react-router-dom";

const API_URL = "https://localhost:7156";

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSent(false);

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !/^\S+@\S+\.\S+$/.test(emailTrimmed)) {
      setError("Podaj poprawny adres e‑mail.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed }),
      });

      const isJson = (res.headers.get("Content-Type") || "").includes("application/json");
      const data = isJson ? await res.json().catch(() => null) : null;

      if (!res.ok) {
        throw new Error(data?.message || `Błąd ${res.status}`);
      }

      setSent(true);
    } catch (err) {
      setError(err.message || "Nie udało się wysłać wiadomości.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 2 }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="h6" fontWeight={700}>Zmień hasło</Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                Podaj adres e‑mail. Jeśli istnieje w systemie, wyślemy instrukcje resetu hasła.
              </Typography>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}
            {sent && (
              <Alert severity="success">
                Jeśli podany adres istnieje, wysłaliśmy wiadomość z linkiem do resetu hasła.
              </Alert>
            )}

            <TextField
              label="Adres e‑mail" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth autoFocus autoComplete="email" disabled={loading}
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button component={RouterLink} to="/Login" disabled={loading}>
                Powrót do logowania
              </Button>
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? <CircularProgress size={22} color="inherit" /> : "Wyślij"}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default ForgotPassword;