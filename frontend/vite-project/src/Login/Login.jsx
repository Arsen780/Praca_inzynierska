import React, {useState, useContext} from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

function Login(){
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [LoginSuccess, setLoginSuccess] = useState(false);

const handleSubmit = async (e) => {

}

return(
<Box component = "form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '300px' }}>
    <TextField label="email" variant="outlined" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
    <TextField label="hasło" variant="outlined" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
    <Button type="submit" variant="contained">Zaloguj się</Button>
</Box>

);
}

export default Login;