import React, {useState, useContext} from "react";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from "@mui/material/Alert";

function Account(){

const[loginStatus, setLoginStatus]=useState("");
const [file, setFile] = useState(null);
const [uploadSuccess, setUploadSuccess] = useState(false);
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const handleUploadPhoto = async (e) =>{
  const f = e.target.files[0];
  if (!f) return setError("Nie wybrano pliku!");

  console.log("wybrano plik:", f);
  setFile(f);

  setUploadSuccess(false);
  setError("");

  const token = localStorage.getItem("jwtToken")
  
  setLoading(true);

  try{
    const formData = new FormData();
    formData.append("AvatarFile", f);

    const response = await fetch("https://localhost:7156/api/users/avatar",{
      method:'POST',
      headers: {Authorization: `Bearer ${token}`},
      body: formData
  });

  const data = await response.json().catch(()=>null);
  if(!response.ok){
    throw new Error(
      (data && (data.message || data.title)) || `Błąd ${response.status}`
            );
  }
  
    console.log("Upload OK:", data);
    setUploadSuccess(true);

  }

  catch(error){
    console.error("Wystąpił problem z uploadem", error);
    setError(error.message);
  }
  finally {
    setLoading(false);
    e.target.value = "";
  }

}

const handleLogout = () => {
  localStorage.removeItem("jwtToken");
  localStorage.removeItem("userId")
  localStorage.removeItem("username")

  setLoginStatus("Wylogowano");
  window.location.assign("/login");
}

  return(
  <Box sx={{width:"100%",display: "flex", flexDirection:'column', alignItems:'flex-end'}}>
    <Box sx={{ width: 250, display: "flex", flexDirection:'column', marginRight:"2%", marginTop:"1%"}}>
      <Button variant="contained" color="error" width='250px' onClick={handleLogout}>Wylogu się</Button>
      <Button type="submit" variant='contained' component='label' width='250px'>
        <input type="file" hidden accept=".jpg,.jpeg,.png" onChange={handleUploadPhoto}/>{loading ? "Wysyłanie..." : "Dodaj zdjęcie"}
      </Button>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {uploadSuccess && !error && <Alert severity="success" sx={{ mt: 1 }}>Awatar przesłany pomyślnie</Alert>}
    </Box>
  </Box>
  )
}

export default Account
