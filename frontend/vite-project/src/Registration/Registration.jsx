import React, {useState, useContext, use} from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

function Registration(){
const[password,setPassword]=useState("")
const[repeatPassword, setRepeatPassword] =useState("")
const[email, setEmail] = useState("")
const[username, setUsername] = useState("")
const[error, setError] = useState("")
const[registrationSuccess, setRegistrationSucces] = useState("")

const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if(password !== repeatPassword) {
        setError("Hasła nie sią takie same!");
        return;
    }

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
};

if(registrationSuccess){
    return(
        <Box sx={{width:'300px'}}>
            <Alert severity="success">Rejestracja pomyślna! Możesz się teraz zalogować.
            </Alert>
        </Box>
    );
}

return(
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '300px' }}>
        <TextField label="email" variant="outlined" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <TextField label="nazwa użytkownika" variant="outlined" type="text" value={username} onChange={(e)=>setUsername(e.target.value)} />
        <TextField label="hasło" variant="outlined" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <TextField label="powtórz hasło" variant="outlined" type="password" value={repeatPassword} onChange={(e)=>setRepeatPassword(e.target.value)
        }required error = {password !== repeatPassword && repeatPassword !== ""} helperText={password !== repeatPassword && repeatPassword !== "" ? "Hasła nie są identyczne!" :""}
        />
            {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained">Zarejestruj się</Button>
    </Box>

);
}

export default Registration;