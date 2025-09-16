import React, {useState, useContext} from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from "@mui/material/Typography";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

function UploadFile(){

const[file, setFile] = useState(null);

const handleFileChange = (event) => {
    // event.target.files to lista plików, bierzemy pierwszy
    const file = event.target.files[0];
    if (file) {
      console.log('Wybrano plik:', file.name);
      setFile(file);
    }
  };

  const handleUpload = async () => {}


return(
    <Box sx={{display: 'flex', flexDirection:'column', alignItems:'center', gap:'2',border:'1px dashed grey',p:'3', borderRadius:'2' }}>
        <Button component='label' variant="contained" startIcon={<CloudUploadIcon />}>
            Wybierz plik
            <input type="file" hidden onChange={handleFileChange} />
        </Button>
        {file && (
            <Typography variant="body1"> Wybrano: {file.name}</Typography>)}
        <Button variant="outlined" onClick={handleUpload} disabled={!file}> Wyślij plik</Button>
    </Box>
);
}
export default UploadFile;