import React, {useState, useContext} from "react";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from "@mui/material/Typography";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";

function UploadFile(){

const[file, setFile] = useState(null);
const[privacy, setPrivacy] = useState("")
const[name, setName] = useState("")
const[description, setDescription] = useState("")
const[uploadSuccess, setUploadSuccess] = useState(false)
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const handleFileChange = (event) => {
    const f = event.target.files[0];
    if (f) {
      console.log('Wybrano plik:', f.name);
      setFile(f);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadSuccess(false);
    setError("");

    const token = localStorage.getItem("jwtToken");

    if (!file) return setError("Wybierz plik.");
    if (!name.trim()) return setError("Podaj nazwę trasy.");
    if (privacy === "") return setError("Wybierz prywatność.");

    setLoading(true);

    try{
        
        const formData= new FormData();
        formData.append("GpxFile",file);
        formData.append("Name",name);
        formData.append("Description",description);
        formData.append("Visibility", String(privacy));


        const response = await fetch("https://localhost:7156/api/routes/upload",{
            method: 'POST',
                body: formData,
                headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json().catch(()=>null);
        if(!response.ok){
            throw new Error(
                (data && (data.message || data.title)) || `Błąd ${response.status}`
            );
        }

        setUploadSuccess(true);

        // reset
        setFile(null);
        setName("");
        setDescription("");
        setPrivacy("");

    } catch(error){
        console.error("Wystąpił problem z uploadem!", error);
        setError(error.message || "Wystąpił problem z uploadem");
    }
    finally{
        setLoading(false);
    }
  }


return(
    <Box>
        <Box sx={{display: 'flex', flexDirection:'column', alignItems:'center', gap:2,border:'1px dashed grey',p:'3', borderRadius:'2', width:'50%', alignContent:'center', margin:'5px' }}>
            <Button component='label' variant="contained" startIcon={<CloudUploadIcon />}>
                Wybierz plik
                <input type="file" hidden onChange={handleFileChange} accept=".gpx" />
            </Button>
            {file && (
                <Typography variant="body1"> Wybrano: {file.name}</Typography>)}
        </Box>
        <Box component='form' onSubmit={handleUpload} sx={{display:'flex', flexDirection:'column', alignItems:'center', gap:'2', p:'3', borderRadius:'2', marginTop:'10%',} }>
            <TextField label="Nazwa trasy" variant="outlined" type="text" margin="normal" onChange={(e)=>setName(e.target.value)} />
            <TextField label="Opis trasy" variant='outlined' type='text' margin='normal' multiline maxRows={5} onChange={(e)=>{const val = e.target.value;
            setDescription(val);
            console.log('Opis trasy (z inputu):', val);}}/>
            <FormControl sx={{m:1, minWidth:'220px'}}>
                <InputLabel id="privacy-label">Prywatność</InputLabel>
                <Select labelId='privacy-label' value={privacy} onChange={(e)=>setPrivacy(e.target.value)} autoWidth label='Prywatność'>
                    <MenuItem value={0}>Prywatna</MenuItem>
                    <MenuItem value={1}>Niepubliczna</MenuItem>
                    <MenuItem value={2}>Publiczna</MenuItem>
                </Select>
            </FormControl>
            <Button type="submit" variant='contained'>Prześlij trasę</Button>
        </Box>
    </Box>
);
}
export default UploadFile;