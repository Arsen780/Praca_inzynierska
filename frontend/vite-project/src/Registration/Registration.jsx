import React, {useState, useContext} from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

function Registration(){
const[password,setPassword]=useState("")
const[repeatPassword, setRepeatPassword] =useState("")
const[email, setEmail] = useState("")
const[username, setUsername] = useState("")

const handleSubmit = async (e) => {

}
return(
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '300px' }}>
        <TextField label="email" variant="outlined" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <TextField label="nazwa użytkownika" variant="outlined" type="text" value={username} onChange={(e)=>setUsername(e.target.value)} />
        <TextField label="hasło" variant="outlined" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <TextField label="powtórz hasło" variant="outlined" type="password" value={repeatPassword} onChange={(e)=>setRepeatPassword(e.target.value)} />
        <Button type="submit" variant="contained">Zarejestruj się</Button>
    </Box>

);
}

export default Registration;