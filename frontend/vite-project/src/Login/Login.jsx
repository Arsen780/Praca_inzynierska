import React, { useState } from "react";
import {Box,Container,Paper,TextField,Button,Typography,Stack,InputAdornment,IconButton,FormControlLabel,Checkbox,Alert,Link as MuiLink,CircularProgress,} from "@mui/material";
import { useHistory, Link as RouterLink } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockOutlined from "@mui/icons-material/LockOutlined";

function Login(){
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [LoginSuccess, setLoginSuccess] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [remember, setRemember] = useState(true);
const [loading, setLoading] = useState(false);
const history= useHistory();
 
const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginSuccess(false);
    setError("");

    if (!username.trim() || !password) {
      setError("Podaj nazwę użytkownika i hasło.");
      return;
    }
    
    setLoading(true);

    try{
        const loginData={
            Username:username,
            Password:password
        };
        const response = await fetch("https://localhost:7156/api/users/login",{
            method: "POST",
                headers:{
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(loginData)
        });

        const responseData = await response.json();
        if (response.ok) {
                const token = responseData.token;
                const user = responseData.user;
                const username = user.username;
                const id = user.id;
                localStorage.setItem('jwtToken', token);
                localStorage.setItem('userId',id);
                localStorage.setItem('username',username);
                console.log("Otrzymany token:",token);
                console.log("Nazwa użytkownika:", username);
                console.log("Id użytkownika:", id);

                window.dispatchEvent(new Event('auth'));

                setError("");
                setLoginSuccess(true); 
                setError("");
                console.log("Udane logowanie");
                history.push("/");
            } else {
                setError(responseData.message || "Wystąpił nieznany błąd!");
                console.error(responseData);
            }
        } catch (error) {
            console.error("Wystąpił problem z logowaniem!", error.message);
            setError("Wystąpił problem z logowaniem!");
        }
        finally{
            setLoading(false);
        }
    };

return(
<Box sx={{ minHeight:"calc(100vh - 64px)", display:"flex", alignItems:"center", justifyContent:"center", py:6}}>
    <Container maxWidth='xs'>
        <Paper elevation={6} sx={{p:4, borderRadius:2}}>
            <Stack spacing={3} component="form" onSubmit={handleSubmit}>
                <Stack spacing={0.5} alignItems="center" >
                    <LockOutlined color='primary' sx={{fontSize:40}} />
                    <Typography variant="h6" fontWeight={700}>
                        Zaloguj się
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                        Witaj ponownie! Wprowadź swoje dane aby kontunuować.
                    </Typography>
                </Stack>

                {error && <Alert severity="error">{error}</Alert>}
                {LoginSuccess &&<Alert severity="success">Zalogowano pomyślnie!</Alert>}

                <TextField label='Nazwa użytkownika' value={username} onChange={(e) => setUsername(e.target.value)} fullWidth autoFocus autoComplete="username" InputProps={{startAdornment: (
                    <InputAdornment position="end">
                    </InputAdornment>),}} 
                />
                
                <TextField label='Hasło' type={showPassword ? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} fullWidth autoComplete="current-password" 
                            InputProps={{
                        endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                        ),
                    }}
                />

                <Stack direction={"row"} alignItems={"center"} justifyContent={"space-between"}>
                    <FormControlLabel control={<Checkbox checked={remember} onChange={(e)=>setRemember(e.target.checked)} />} label='Zapamiętaj mnie' />
                    <MuiLink component={RouterLink} to="/ForgotPassword" underline="hover">
                    Zapomniałeś hasła?
                    </MuiLink>
                </Stack>

                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit"/> : null}> 
                    {loading ? "Logowanie..." : "Zaloguj się"}
                </Button>

                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Nie masz konta?{" "}
                    <MuiLink component={RouterLink} to="/Registration" underline="hover">
                        Zarejestruj się
                    </MuiLink>
                </Typography>
            </Stack>
        </Paper>
    </Container>
</Box>

);
}   
export default Login;