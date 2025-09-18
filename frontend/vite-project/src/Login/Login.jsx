import React, {useState, useContext} from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

function Login(){
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [LoginSuccess, setLoginSuccess] = useState(false);

const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginSuccess(false);
    setError("");
    
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

                setError("");
                setLoginSuccess(true); 
                setError("");
                console.log("Udane logowanie")
            } else {
                setError(responseData.message || "Wystąpił nieznany błąd!");
                console.error(responseData);
            }
        } catch (error) {
            console.error("Wystąpił problem z logowaniem!", error.message);
            setError("Wystąpił problem z logowaniem!");
        }
    };


return(
<Box component = "form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '300px' }}>
    <TextField label="nazwa użytkownika" variant="outlined" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
    <TextField label="hasło" variant="outlined" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
    <Button type="submit" variant="contained">Zaloguj się</Button>
</Box>

);
}
export default Login;