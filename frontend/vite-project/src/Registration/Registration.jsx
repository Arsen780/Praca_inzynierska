import React, { useState } from "react";
import {Box,Container,Paper,TextField,Button,Typography,Stack,InputAdornment,IconButton,Alert,Link as MuiLink,CircularProgress,} from "@mui/material";
import { useHistory, Link as RouterLink } from "react-router-dom";
import MailOutline from "@mui/icons-material/MailOutline";
import PersonOutline from "@mui/icons-material/PersonOutline";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockOutlined from "@mui/icons-material/LockOutlined";

function Registration(){
const[password,setPassword]=useState("")
const[repeatPassword, setRepeatPassword] =useState("")
const[email, setEmail] = useState("")
const[username, setUsername] = useState("")
const[error, setError] = useState("")
const[registrationSuccess, setRegistrationSucces] = useState(false)
const[loading, setLoading] = useState(false);
const[showPassword, setShowPassword] = useState(false);
const[showRepeat, setShowRepeat] = useState(false);

const history = useHistory();
const passwordMissMatch = repeatPassword !== "" && repeatPassword !==password;

const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if(password !== repeatPassword) {
        setError("Hasła nie sią takie same!");
        return;
    }

    if(password.length < 8){
        setError("Hasło musi mieć conajmniej 8 znaków!")
        return;
    }

    if(!email.trim() || !username.trim() || !password || !repeatPassword){
        setError("Wypełnij wszystkie pola!");
        return;
    }

    setLoading(true);

    try{
        const registrationData={
            username:username,
            password:password,
            email:email
        };
        const response = await fetch("https://localhost:7156/api/users/register",{
            method: "POST",
                headers:{
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(registrationData)

        });

        const responseData = await response.json();
        if(response.ok){
            setError("");
            setRegistrationSucces(true);
            console.log("Udana rejestracja!");
        } else {
            setError(responseData.message || "Wystąpił nieznany błąd!");
            console.error(responseData);
        }
    } catch(error){
        console.error("Wystąpił problem z rejestracją!", error.message);
        setError("Wystąpił problem z rejestracją");
    }
    finally{
        setLoading(false);
    }
};

if (registrationSuccess) {
    return (
        <Box sx={{ minHeight: "calc(100vh - 64px)", display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <Container maxWidth='sm'> {/* Zwiększyłem szerokość dla lepszego wyglądu */}
                <Paper elevation={6} sx={{ p: 4, borderRadius: 2 }}>
                    <Stack spacing={2} alignItems={"center"}>
                        <Alert severity="success" icon={false} sx={{ width: "100%", textAlign: 'center' }}>
                            <Typography variant="h6" gutterBottom>Rejestracja pomyślna!</Typography>
                            <Typography>Wysłaliśmy link aktywacyjny na Twój adres e-mail. Sprawdź swoją skrzynkę (również folder SPAM), aby dokończyć proces.</Typography>
                        </Alert>
                        <Button variant="contained" component={RouterLink} to="/">
                            Wróć na stronę główną
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}

return(
    <Box sx={{minHeight:"calc(100vh - 64px)", display:"flex", alignItems:"center", justifyContent:"center", py:6}}>
        <Container maxWidth="xs">
            <Paper elevation={6} sx={{p:4, borderRadius:2}}>
                <Stack spacing={3} component={'form'} onSubmit={handleSubmit} autoComplete="on">
                    <Stack spacing={0.5} alignItems={'center'}>
                        <LockOutlined color="primary" sx={{ fontSize: 40 }} />
                        <Typography variant="h5" fontWeight={700}>
                            Załóż konto
                        </Typography>
                        <Typography variant="body2" color="text.secondary" align="center">
                        Wypełnij formularz, aby utworzyć nowe konto.
                        </Typography>
                    </Stack>

                    {error && <Alert severity="error">{error}</Alert>}

                    <TextField name="email" label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} fullWidth autoComplete="email" 
                    InputProps={{
                        startAdornment:(
                            <InputAdornment position="start">
                                <MailOutline/>
                            </InputAdornment>
                        )
                    }} />

                    <TextField name="username" label='Username' value={username} onChange={(e)=>setUsername(e.target.value)} fullWidth autoComplete="username"
                    InputProps={{
                        startAdornment:(
                            <InputAdornment position='start'>
                                <PersonOutline/>
                            </InputAdornment>
                        )
                    }}>
                    </TextField>

                    <TextField name="password" label="Hasło" type={showPassword ? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} fullWidth autoComplete="new-password" helperText="Minimum 8 znaków!" 
                    InputProps={{
                        endAdornment:(
                            <InputAdornment position="end">
                                <IconButton aria-label={showPassword? "Ukryj hasło": "Pokaz hasło"} onClick={()=>setShowPassword((v)=>!v)} onMouseDown={(e) => e.preventDefault()}edge="end" >
                                    {showPassword? <VisibilityOff/> : <Visibility/>}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}>
                    </TextField>

                    <TextField name="repeat-password" label="Powtóz hasło" type={showRepeat? "text": "password"} value={repeatPassword} onChange={(e)=>setRepeatPassword(e.target.value)} fullWidth autoComplete="new-password" error={passwordMissMatch} helperText={passwordMissMatch? "Hasła nie są identyczne!":""} 
                    InputProps={{
                        endAdornment:(
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label={showRepeat ? "Ukryj hasło" : "Pokaż hasło"}
                                    onClick={() => setShowRepeat((v) => !v)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    edge="end"
                                    >
                                    {showRepeat ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}>
                    </TextField>

                    <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}>
                        {loading ? "Rejestracja..." : "Zarejestruj się"}
                    </Button>

                    <Typography variant="body2" color="text.secondary" textAlign={"center"}>
                        Masz już konto?{" "}
                        <MuiLink component={RouterLink} to="/Login" underline="hover">
                            Zaloguj się
                        </MuiLink>
                    </Typography>
                </Stack>
            </Paper>
        </Container>
    </Box>
);
}

export default Registration;