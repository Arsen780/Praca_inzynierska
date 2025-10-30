import React, { useState, useMemo, useEffect } from "react";
import { Box, Button, Stack, Paper, Alert, Typography, Container, TextField } from "@mui/material";
import { useHistory, Link as RouterLink } from "react-router-dom";

function ChangePassword() {

    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {

    }

  return (
    <Box sx={{minHeight: "calc(100vh - 64px)", display:"flex", justifyContent:'center', alignItems:"center", py:6}}>
        <Container maxWidth="sm">
            <Paper elevation={6} sx={{p:4, borderRadius:2}}>
                <Stack spacing={3} component="form" onSubmit={handleSubmit}>
                    <Stack alignItems={'center'} spacing={0.5}>
                        <Typography variant="h6" fontWeight={700}>Zmień hasło</Typography>
                        <Typography variant="body2" color="text.secondary" align="center">Aby zmienić hasło musisz podać obecne hasło</Typography>
                    </Stack>

                    <TextField label="Hasło" type="password" name="hasło" value={password} onChange={(e)=>{setPassword(e.target.value)}} fullWidth autoFocus disabled={loading} />
                    <TextField label="Powtórz hasło" type="password" name="powtórz hasło" value={repeatPassword} onChange={(e)=>{setRepeatPassword(e.target.value)}} fullWidth autoFocus disabled={loading} />
                    <Stack direction={'row'} spacing={2} justifyContent={'flex-end'}>
                        <Button component={RouterLink} to="/Account" disabled={loading}>
                            Powrót do Profilu
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

export default ChangePassword;