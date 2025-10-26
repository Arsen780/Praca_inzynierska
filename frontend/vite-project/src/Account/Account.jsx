import React, {useState, useMemo, useRef, useEffect} from "react";
import {
  Box, Button, Alert, Avatar, Paper, Stack, Typography, Divider, Chip, LinearProgress, Container
} from "@mui/material";

const API_URL = "https://localhost:7156";

function formatDuration (sec){
  if(!sec && sec!== 0) return '-';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec %3600)/60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

function Account(){

const[loginStatus, setLoginStatus]=useState("");
const [file, setFile] = useState(null);
const [uploadSuccess, setUploadSuccess] = useState(false);
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);
const [avatarSrc, setAvatarSrc] = useState("");

const [routesLoading, setRoutesLoading] = useState(false);
const [statsError, setStatsError] = useState("");
const [stats, setStats] = useState({
    routeCount: 0,
    totalDistanceMeters: 0,
    totalDurationSeconds: 0,
    avgSpeedKmh: 0,
})

const getAvatar = ()=>{
  const uid = localStorage.getItem("userId");
  setAvatarSrc(`${API_URL}/avatars/${uid}.jpg?t=${Date.now()}`);
}
  useEffect(() => {
    getAvatar();
    const token = localStorage.getItem("jwtToken");
  }, []);

    // Pobierz trasy i policz agregaty
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) return;

    setRoutesLoading(true);
    setStatsError("");
    fetch(`${API_URL}/api/routes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.message || `Błąd ${r.status}`);

        const routes = Array.isArray(data) ? data : [];
        const toNum = (v) => (v == null ? 0 : Number(v));

        const routeCount = routes.length;
        const totalDistanceMeters = routes.reduce(
          (acc, r) => acc + toNum(r?.stats?.totalDistanceMeters),
          0
        );
        const totalDurationSeconds = routes.reduce(
          (acc, r) => acc + toNum(r?.stats?.durationSeconds),
          0
        );
        const avgSpeedKmh =
          totalDurationSeconds > 0
            ? (totalDistanceMeters / 1000) / (totalDurationSeconds / 3600)
            : 0;

        setStats({
          routeCount,
          totalDistanceMeters,
          totalDurationSeconds,
          avgSpeedKmh,
        });
      })
      .catch((e) => setStatsError(e.message || "Nie udało się pobrać tras."))
      .finally(() => setRoutesLoading(false));
  }, []);

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

const distanceKm = useMemo(
    () => (stats.totalDistanceMeters / 1000).toFixed(2),
    [stats.totalDistanceMeters]
  );
  const avgSpeed = useMemo(
    () => stats.avgSpeedKmh.toFixed(1),
    [stats.avgSpeedKmh]
  );

  return(
    <Box>
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

    <Box sx={{display:"flex", alignItems:"center", justifyContent:"center", py:6}}>
      <Container maxWidth='xs'>
        <Paper elevation={6} sx={{p:4, borderRadius:2}}>
          <Stack spacing={3} component="form">
            <Stack spacing={0.5} alignItems="center" >
              <Typography variant="h5" fontWeight={600}>{localStorage.getItem('username')}</Typography>
              <Avatar alt="awatar" src={avatarSrc} sx={{width:170, height:170}}/>
              <Typography variant="h6" fontWeight={400}>Liczba tras:{stats.routeCount}</Typography>
              <Typography variant="h6" fontWeight={400}>Przejechane km:{distanceKm}</Typography>
              <Typography variant="h6" fontWeight={400}>Spędzony czas: {formatDuration(stats.totalDurationSeconds)}</Typography>
              <Typography variant="h6" fontWeight={400}>Średnia prędkość: {stats.avgSpeedKmh.toFixed(2)} km/h</Typography>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
    </Box>
  )

}

export default Account
