import React, { useState, useMemo, useEffect } from "react";
import {
  Box, Button, Alert, Avatar, Paper, Stack, Typography, Chip, LinearProgress
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const API_URL = "https://localhost:7156";

function formatDuration(sec) {
  if (!sec && sec !== 0) return "-";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}
function formatDistance(m) {
  if (m == null) return "—";
  return `${(Number(m) / 1000).toFixed(2)} km`;
}
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pl-PL");
}
function visibilityToChip(v) {
  const num = Number(v);
  if (!Number.isNaN(num)) {
    if (num === 2) return { label: "Publiczna", color: "success" };
    if (num === 1) return { label: "Niepubliczna", color: "warning" };
    return { label: "Prywatna", color: "error" };
  }
  const s = String(v || "").toLowerCase();
  if (s.includes("public")) return { label: "Publiczna", color: "success" };
  if (s.includes("unlisted") || s.includes("niepubliczna"))
    return { label: "Niepubliczna", color: "warning" };
  return { label: "Prywatna", color: "default" };
}

function Account() {
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [avatarSrc, setAvatarSrc] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  const [resetpassword, setResetPassword] = useState("");
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState("");
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState({
    routeCount: 0,
    totalDistanceMeters: 0,
    totalDurationSeconds: 0,
    avgSpeedKmh: 0,
  });

  const handleResetPassword = (e)=>
    {
      setResetPassword(e.target.value)
  }

  useEffect(() => {
    const uid = localStorage.getItem("userId");
    if (uid) setAvatarSrc(`${API_URL}/avatars/${uid}.jpg?t=${Date.now()}`);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) return;

    setRoutesLoading(true);
    setRoutesError("");
    fetch(`${API_URL}/api/routes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.message || `Błąd ${r.status}`);

        const list = Array.isArray(data) ? data : [];
        setRoutes(list);

        const toNum = (v) => (v == null ? 0 : Number(v));
        const routeCount = list.length;
        const totalDistanceMeters = list.reduce((acc, r) => acc + toNum(r?.stats?.totalDistanceMeters), 0);
        const totalDurationSeconds = list.reduce((acc, r) => acc + toNum(r?.stats?.durationSeconds), 0);
        const avgSpeedKmh =
          totalDurationSeconds > 0
            ? (totalDistanceMeters / 1000) / (totalDurationSeconds / 3600)
            : 0;

        setStats({ routeCount, totalDistanceMeters, totalDurationSeconds, avgSpeedKmh });
      })
      .catch((e) => setRoutesError(e.message || "Nie udało się pobrać tras."))
      .finally(() => setRoutesLoading(false));
  }, []);

  const handleUploadPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return setUploadError("Nie wybrano pliku!");
    setUploadSuccess(false);
    setUploadError("");

    const token = localStorage.getItem("jwtToken");
    if (!token) {
      setUploadError("Brak autoryzacji. Zaloguj się.");
      e.target.value = "";
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("AvatarFile", f);

      const response = await fetch(`${API_URL}/api/users/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((data && (data.message || data.title)) || `Błąd ${response.status}`);
      }

      setUploadSuccess(true);

      const url = data?.avatarUrl
        ? `${API_URL}${data.avatarUrl}?t=${Date.now()}`
        : `${API_URL}/avatars/${localStorage.getItem("userId")}.jpg?t=${Date.now()}`;
      setAvatarSrc(url);

      window.dispatchEvent(new Event("auth"));
    } catch (err) {
      setUploadError(err.message || "Wystąpił problem z uploadem");
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    window.location.assign("/Login");
  };

  const distanceKm = useMemo(
    () => (stats.totalDistanceMeters / 1000).toFixed(2),
    [stats.totalDistanceMeters]
  );

  const [deleteId, setDeleteId] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDelete = async (routeIdToDelete)=>{
    if (!window.confirm("Czy na pewno chcesz usunąć tę trasę? Tej operacji nie można cofnąć.")) {
        return;
    }

    setDeleteId(routeIdToDelete);
    setDeleteError("");

    const token = localStorage.getItem('jwtToken');
    if(!token){
      setDeleteError("Musisz być zalogowany aby wykonać tą operację!");
      setDeleteId(null);
      return;
    }

    try{
      const response = await fetch(`https://localhost:7156/api/routes/${routeIdToDelete}`,{
        method: "DELETE",
        headers:{
          "Authorization": `Bearer ${token}`
        }
      })

      if(!response.ok){
        const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Błąd serwera: ${response.status}`);
      }

      const updateRoutes = routes.filter(r => r.id !== routeIdToDelete);
      setRoutes(updateRoutes);
      calculateStats(updateRoutes);

    }
    catch (error){
      setDeleteError(error.message || "Nie udało się usunąć trasy.");
    }
    finally{
      setDeleteId(null);
    }
  }

  return (
    <Box sx={{ px: 2, py: 3 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "360px 1fr" }, gap: 3, alignItems: "start" }}>
        {/* lewa kolumna: karta użytkownika */}
        <Paper elevation={6} sx={{p:4, borderRadius:2}}>
          <Stack spacing={3} component="form">
            <Stack spacing={0.5} alignItems="center" >
              <Typography variant="h5" fontWeight={600}>{localStorage.getItem('username')}</Typography>
              <Avatar alt="awatar" src={avatarSrc} sx={{width:170, height:170}}/>
              <Typography variant="h6" fontWeight={400}>Liczba tras: {stats.routeCount}</Typography>
              <Typography variant="h6" fontWeight={400}>Przebyte km: {distanceKm}</Typography>
              <Typography variant="h6" fontWeight={400}>Spędzony czas: {formatDuration(stats.totalDurationSeconds)}</Typography>
              <Typography variant="h6" fontWeight={400}>Średnia prędkość: {stats.avgSpeedKmh.toFixed(2)} km/h</Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* prawa kolumna: akcje i moje trasy */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* akcje konta */}
          <Paper elevation={6} sx={{ p: 3, borderRadius: 2 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={600}>Akcje konta</Typography>

              <Button variant="contained" color="error" onClick={handleLogout} sx={{ alignSelf: "flex-start", minWidth:150 }}>
                Wyloguj się
              </Button>

              <Button variant='contained' component={RouterLink} to={"/ChangePassword"} sx={{alignSelf:'flex-start', minWidth:150}}>
                Zmień hasło
              </Button>

              <Stack spacing={1}>
                <Button variant="contained" component="label" disabled={uploadLoading} sx={{ alignSelf: "flex-start", minWidth:150}}>
                  <input type="file" hidden accept=".jpg" onChange={handleUploadPhoto} />
                  {uploadLoading ? "Ładowanie..." : "Dodaj zdjęcie"}
                </Button>
                {uploadError && <Alert severity="error">{uploadError}</Alert>}
                {uploadSuccess && !uploadError && <Alert severity="success">Awatar przesłany pomyślnie</Alert>}
                <Typography variant="caption" color="text.secondary">
                  Uwaga: backend akceptuje tylko pliki .jpg
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Moje trasy */}
          <Paper elevation={6} sx={{ p: 3, borderRadius: 2, maxHeight: 440, overflowY: "auto" }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={600}>Moje trasy</Typography>

              {routesLoading && <LinearProgress />}
              {routesError && !routesLoading && <Alert severity="error">{routesError}</Alert>}

              {!routesLoading && !routesError && routes.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Nie masz jeszcze żadnych tras.
                </Typography>
              )}

              {!routesLoading && !routesError && routes.length > 0 && (
                <Stack spacing={1.5}>
                  {routes.map((r, idx) => {
                    const dist = formatDistance(r?.stats?.totalDistanceMeters);
                    const dur = formatDuration(r?.stats?.durationSeconds);
                    const avg = r?.stats?.avgSpeedKmh != null ? `${Number(r.stats.avgSpeedKmh).toFixed(1)} km/h` : "—";
                    const created = formatDate(r?.createdAt);
                    const vis = visibilityToChip(r?.visibility);

                    return (
                      <Paper key={r.id || idx} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                        <Stack spacing={1}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={700} noWrap>
                              {r.name || "Bez nazwy"}
                            </Typography>
                            <Chip
                              size="small"
                              label={vis.label}
                              color={vis.color}
                              variant={vis.color === "default" ? "outlined" : "filled"}
                            />
                          </Stack>

                          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Chip size="small" label={`Dystans: ${dist}`} />
                              <Chip size="small" label={`Czas: ${dur}`} />
                              <Chip size="small" label={`Śr.: ${avg}`} />
                              <Chip size="small" label={`Utworzono: ${created}`} />
                            </Stack>
                              <Stack direction='row' spacing={1} >
                                <Button size='small' variant='contained' color="error" onClick={()=>handleDelete(r.id)}>
                                  Usuń trasę
                                </Button>

                                <Button
                                  size="small"
                                  variant="outlined"
                                  component={RouterLink}
                                  to={`/routes/${r.id}`}
                                >
                                  Szczegóły
                                </Button>
                              </Stack>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default Account;