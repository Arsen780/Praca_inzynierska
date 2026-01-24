import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Card, CardContent, CardActions, Typography, Button, Stack,
  TextField, Select, FormControl, InputLabel, MenuItem, Alert, Chip,
  LinearProgress, Tooltip
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const API_URL = "https://localhost:7156";
const MAX_FILE_MB = 20;
const PRIVACY_OPTIONS = [
  { value: "0", label: "Prywatna" },
  { value: "1", label: "Niepubliczna" },
  { value: "2", label: "Publiczna" },
];

function humanFileSize(bytes) {
  if (!bytes && bytes !== 0) return "-";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const sizes = ["B", "KB", "MB", "GB"];
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pl-PL");
}

async function parseGpxMeta(file) {
  try {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) throw new Error("Nieprawidłowy format pliku GPX.");

    const nameFromGpx =
      doc.querySelector("gpx > trk > name")?.textContent?.trim() ||
      doc.querySelector("gpx > metadata > name")?.textContent?.trim() ||
      "";

    const descFromGpx =
      doc.querySelector("gpx > trk > desc")?.textContent?.trim() ||
      doc.querySelector("gpx > metadata > desc")?.textContent?.trim() ||
      "";

    const trkpts = Array.from(doc.getElementsByTagName("trkpt"));
    const pointCount = trkpts.length;

    const times = trkpts
      .map((p) => p.getElementsByTagName("time")[0]?.textContent?.trim())
      .filter(Boolean)
      .map((t) => new Date(t))
      .filter((d) => !isNaN(d.getTime()));
    const startTime = times.length ? new Date(Math.min(...times)) : null;
    const endTime = times.length ? new Date(Math.max(...times)) : null;

    const hasElevation = trkpts.some((p) => p.getElementsByTagName("ele")[0]);

    return {
      nameFromGpx,
      descFromGpx,
      pointCount,
      startTime: startTime?.toISOString() || null,
      endTime: endTime?.toISOString() || null,
      hasElevation,
    };
  } catch {
    return null;
  }
}

function UploadFile() {
  const [file, setFile] = useState(null);
  const [gpxMeta, setGpxMeta] = useState(null);

  const [privacy, setPrivacy] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [serverRoute, setServerRoute] = useState(null);

  const xhrRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    return () => {
      xhrRef.current?.abort?.();
    };
  }, []);

  const resetForm = () => {
    setFile(null);
    setGpxMeta(null);
    setName("");
    setDescription("");
    setPrivacy("");
    setUploadSuccess(false);
    setError("");
    setServerRoute(null);
    setProgress(0);
  };

  const onFileSelected = async (f) => {
    if (!f) return;

    const ext = f.name.toLowerCase().split(".").pop();
    if (ext !== "gpx") {
      setError("Dozwolone są wyłącznie pliki .gpx");
      return;
    }
    const sizeMb = f.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_MB) {
      setError(`Plik jest zbyt duży. Limit: ${MAX_FILE_MB} MB.`);
      return;
    }

    setError("");
    setUploadSuccess(false);
    setFile(f);

    const meta = await parseGpxMeta(f);
    setGpxMeta(meta);

    if (!name.trim()) {
      const gpxName = meta?.nameFromGpx?.trim();
      const filenameBase = f.name.replace(/\.[^.]+$/, "");
      setName(gpxName || filenameBase);
    }
    if (!description.trim() && meta?.descFromGpx) {
      setDescription(meta.descFromGpx);
    }
  };

  const handleInputFile = (e) => {
    const f = e.target.files?.[0];
    if (f) onFileSelected(f);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    setUploadSuccess(false);
    setServerRoute(null);
    setProgress(0);

    const token = localStorage.getItem("jwtToken");
    if (!token) {
      setError("Brak autoryzacji. Zaloguj się, aby przesłać trasę.");
      return;
    }
    if (!file) return setError("Wybierz plik .gpx.");
    if (!name.trim()) return setError("Podaj nazwę trasy.");
    if (privacy === "" || privacy == null) return setError("Wybierz prywatność.");

    setLoading(true);

    const formData = new FormData();
    formData.append("GpxFile", file);
    formData.append("Name", name.trim());
    formData.append("Description", description.trim());
    formData.append("Visibility", String(privacy));

    try {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.open("POST", `${API_URL}/api/routes/upload`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setProgress(pct);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;

        let data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {}

        if (xhr.status === 401) {
          setError("Brak autoryzacji (401). Zaloguj się i spróbuj ponownie.");
          setLoading(false);
          return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadSuccess(true);
          setServerRoute(data || null);
        } else {
          setError((data && (data.message || data.title)) || `Błąd ${xhr.status}`);
        }
        setLoading(false);
      };

      xhr.onerror = () => {
        setError("Wystąpił problem z połączeniem podczas wysyłki.");
        setLoading(false);
      };

      xhr.send(formData);
    } catch (err) {
      setError(err?.message || "Wystąpił nieznany błąd podczas wysyłki.");
      setLoading(false);
    }
  };

  const cancelUpload = () => {
    try {
      xhrRef.current?.abort();
      setLoading(false);
      setProgress(0);
    } catch {}
  };

  const canSubmit = useMemo(() => {
    return !!file && !!name.trim() && privacy !== "" && !loading;
  }, [file, name, privacy, loading]);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 3 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Prześlij trasę GPX
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Wybierz plik .gpx lub przeciągnij i upuść. Uzupełnij nazwę, opis i widoczność.
          </Typography>

          <Box
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            sx={{ border: "2px dashed", borderColor: dragActive ? "primary.main" : "divider", borderRadius: 2, p: 3, 
              textAlign: "center", bgcolor: dragActive ? "action.hover" : "background.paper", transition: "all .15s ease-in-out", mb: 2, }} >
            <Stack spacing={1} alignItems="center">
              <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>
                Wybierz plik .gpx
                <input type="file" hidden accept=".gpx" onChange={handleInputFile} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                lub przeciągnij i upuść tutaj
              </Typography>

              {file && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap", justifyContent: "center" }} >
                  <Chip label={`Plik: ${file.name}`} />
                  <Chip label={`Rozmiar: ${humanFileSize(file.size)}`} />
                </Stack>
              )}

              {gpxMeta && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap", justifyContent: "center" }} >
                  <Chip color="primary" label={`Punkty: ${gpxMeta.pointCount ?? "—"}`} />
                  <Chip label={`Start: ${formatDate(gpxMeta.startTime)}`} />
                  <Chip label={`Koniec: ${formatDate(gpxMeta.endTime)}`} />
                  <Chip
                    label={gpxMeta.hasElevation ? "Elewacja: tak" : "Elewacja: brak"}
                    color={gpxMeta.hasElevation ? "success" : "default"}
                  />
                </Stack>
              )}
            </Stack>
          </Box>

          <Stack component="form" spacing={2} onSubmit={handleUpload}>
            <TextField label="Nazwa trasy" value={name} onChange={(e) => setName(e.target.value)} 
              fullWidth required helperText={!name?.trim() && gpxMeta?.nameFromGpx ? `Sugerowana: ${gpxMeta.nameFromGpx}` : " "} />

            <TextField label="Opis trasy" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline
              minRows={2} maxRows={8} helperText={gpxMeta?.descFromGpx ? "Wstępny opis wczytany z GPX (możesz edytować)" : " "} />
            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="privacy-label">Prywatność</InputLabel>
              <Select labelId="privacy-label" label="Prywatność" value={privacy} onChange={(e) => setPrivacy(e.target.value)} required >
                {PRIVACY_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {loading && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" color="text.secondary">
                  Wysyłanie: {progress}%
                </Typography>
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
            {uploadSuccess && !error && (
              <Alert
                icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                severity="success"
                sx={{ alignItems: "center" }}
              >
                Trasa została przesłana pomyślnie.
              </Alert>
            )}

            {serverRoute?.stats && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Podsumowanie z serwera</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={`Dystans: ${(serverRoute.stats.totalDistanceMeters / 1000).toFixed(2)} km`} />
                  <Chip label={`Czas: ${serverRoute.stats.durationSeconds}s`} />
                  <Chip label={`Śr. prędkość: ${Number(serverRoute.stats.avgSpeedKmh).toFixed(1)} km/h`} />
                  <Chip label={`Max prędkość: ${Number(serverRoute.stats.maxSpeedKmh).toFixed(1)} km/h`} />
                  <Chip label={`Przewyższenia: +${(serverRoute.stats.elevationGainMeters).toFixed(0)} / -${(serverRoute.stats.elevationLossMeters).toFixed(0)} m`} />
                </Stack>
              </Box>
            )}

            <CardActions sx={{ justifyContent: "flex-end", pt: 1 }}>
              {!loading && (
                <Tooltip title="Wyczyść formularz">
                  <Button onClick={resetForm} color="inherit">Reset</Button>
                </Tooltip>
              )}
              {loading ? (
                <Button onClick={cancelUpload} color="warning" variant="outlined">
                  Anuluj
                </Button>
              ) : (
                <Button type="submit" variant="contained" disabled={!canSubmit}>
                  Prześlij trasę
                </Button>
              )}
            </CardActions>
          </Stack>
        </CardContent>
      </Card>

      {gpxMeta && !gpxMeta.hasElevation && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Uwaga: ten GPX nie zawiera elewacji. Przewyższenia mogą być równe 0.
        </Typography>
      )}
    </Box>
  );
}

export default UploadFile;