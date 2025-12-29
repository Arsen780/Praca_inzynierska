import React, { useState } from "react";
import { Box, Button, Stack, Paper, Alert, Typography, Container, TextField, Collapse, InputAdornment, IconButton, CircularProgress} from "@mui/material";
import { useHistory, Link as RouterLink } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const API_URL = "https://localhost:7156";

function ChangePassword() {

    const history = useHistory();
    const [step, setStep] = useState(1);

    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const handleVerifyPassword = async (e) =>{
        e.preventDefault();
        setLoading(true);
        setError("");

        try{
            const username = localStorage.getItem("username");
            if(!username){
                throw new Error("Nie znaleziono użytkownika!");
            }

            const response = await fetch(`${API_URL}/api/users/login`,{
                method: 'POST',
                headers: {"Content-Type" : "application/json"},
                body: JSON.stringify({username, password:password}),
            });

            const data = await response.json();
            if(!response.ok){
                throw new Error(data.message || "Obecne hasło nie jest prawidłowe");
            }
            setError("");
            setStep(2);
        }
        catch(error){
            setError(error.message);
        }
        finally{
            setLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if(newPassword.length < 8){
            return setError("Hasło musi mieć conajmniej 8 zanków!");
        }

        if( newPassword !== confirmPassword){
            return setError("Hasła nie są takie same!");
        }

        setLoading(true);
        const token = localStorage.getItem("jwtToken");
        if(!token){
            setError("Brak autoryzacji, zaloguj się!");
            setLoading(false);
            return;
        }

        try{
            const response = await fetch(`${API_URL}/api/users/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization" : `Bearer ${token}`
                },
                body: JSON.stringify({ CurrentPassword: password, NewPassword: newPassword })
            })

            const data = await response.json();
            if(!response.ok){
                throw new Error(data.message || "Nie udało się zmienić hasła.");
            }

            setSuccess(data.message || "Hasło zostało pomyślnie zmienione!");
            setTimeout(() => history.push("/Account"), 3000);
        }
        catch(error){
            setError(error.message);
        }
        finally{
            setLoading(false);
        }

    }

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", display: "flex", justifyContent: 'center', alignItems: "center", py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 2 }}>
            <Stack spacing={2} alignItems={'center'}>
                <Typography variant="h6" fontWeight={700}>Zmień hasło</Typography>
                {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ width: '100%' }}>{success}</Alert>}
            </Stack>

            <Collapse in={step === 1} unmountOnExit>
              <Stack component="form" onSubmit={handleVerifyPassword} spacing={2} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" align="center">
                  Aby kontynuować, wprowadź swoje obecne hasło.
                </Typography>
                <TextField
                  label="Obecne hasło"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  autoFocus
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(v => !v)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button type="submit" variant="contained" size="large" disabled={loading || !password}>
                  {loading ? <CircularProgress size={24} /> : "Weryfikuj"}
                </Button>
              </Stack>
            </Collapse>

            <Collapse in={step === 2}>
              <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" align="center">
                  Wprowadź swoje nowe hasło.
                </Typography>
                <TextField
                  label="Nowe hasło"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  autoFocus
                  disabled={loading}
                  helperText="Minimum 8 znaków."
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowNewPassword(v => !v)} edge="end">
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Powtórz nowe hasło"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  disabled={loading}
                  error={confirmPassword !== "" && newPassword !== confirmPassword}
                  helperText={confirmPassword !== "" && newPassword !== confirmPassword ? "Hasła nie są identyczne" : " "}
                />
                <Button type="submit" variant="contained" size="large" disabled={loading || !newPassword || !confirmPassword}>
                  {loading ? <CircularProgress size={24} /> : "Zmień hasło"}
                </Button>
              </Stack>
            </Collapse>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button component={RouterLink} to="/Account" disabled={loading}>
                    Powrót do Profilu
                </Button>
            </Box>
        </Paper>
      </Container>
    </Box>
  );

}

export default ChangePassword;