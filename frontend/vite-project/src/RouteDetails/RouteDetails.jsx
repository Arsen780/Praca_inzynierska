import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { Box, Paper, Typography, Chip, Stack, Grid, Skeleton, Alert, Button, ButtonGroup } from "@mui/material";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Importy dla obrazków markerów
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const API_URL = "https://localhost:7156";

// --- Helper Functions ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
function formatDuration(sec) {
  if (!sec && sec !== 0) return "-";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
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
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
function getColorForValue(value, min, max) {
    if (max === min) return 'hsl(120, 100%, 50%)';
    const normalized = (value - min) / (max - min);
    const hue = (1 - normalized) * 120;
    return `hsl(${hue}, 100%, 50%)`;
}

function GenerateGpxContent(routeName, points){
    if(!points || points.length == 0){
      return null;
    }

    const trackpoints = points.map(p => {
      const time = new Date(p.timestamp).toISOString();
      const elevationTag = p.elevation != null ? `<ele>${p.elevation.toFixed(2)}</ele>` : '';
      return `
      <trkpt lat="${p.latitude.toFixed(6)}" lon="${p.longitude.toFixed(6)}">
        ${elevationTag}
        <time>${time}</time>
      </trkpt>`;
    }).join('');

    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1" creator="GeoLogApp" 
          xmlns="http://www.topografix.com/GPX/1/1" 
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
          xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
          <metadata>
              <name>${routeName || 'Trasa z GeoLog'}</name>
              <time>${new Date().toISOString()}</time>
          </metadata>
          <trk>
              <name>${routeName || 'Trasa z GeoLog'}</name>
              <trkseg>${trackpoints}
              </trkseg>
          </trk>
      </gpx>`;


    return gpxContent;
  }
// --- Koniec Helper Functions ---


function RouteDetails() {
  const { id } = useParams();
  const [route, setRoute] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState('default');
  const [chartType, setChartType] = useState('speed');

  useEffect(() => {
    if (!id) return;

    const fetchRouteData = async () => {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("jwtToken");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        const [routeRes, pointsRes] = await Promise.all([
          fetch(`${API_URL}/api/routes/${id}`, { headers }),
          fetch(`${API_URL}/api/routes/${id}/points`, { headers }),
        ]);
        
        // Jeśli backend zwróci 404 lub inny błąd, rzucamy wyjątek
        if (!routeRes.ok) {
           const errorData = await routeRes.json().catch(() => null); // próbujemy odczytać JSON z błędem
           throw new Error(errorData?.message || `Trasa nie została znaleziona lub nie masz do niej dostępu (kod: ${routeRes.status}).`);
        }
        if (!pointsRes.ok) {
           throw new Error(`Błąd pobierania punktów trasy (kod: ${pointsRes.status}).`);
        }
        
        const routeData = await routeRes.json();
        const pointsData = await pointsRes.json();

        setRoute(routeData);
        setPoints(pointsData);

      } catch (e) {
        setError(e.message || "Wystąpił nieznany błąd podczas pobierania danych.");
      } finally {
        setLoading(false);
      }
    };

    fetchRouteData();
  }, [id]);

  const processedData = useMemo(() => {
    if (points.length < 2) return null;
    let minElev = Infinity, maxElev = -Infinity;
    let minSpeed = Infinity, maxSpeed = -Infinity;
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i+1];
        const distance = calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        const timeDiff = (new Date(p2.timestamp).getTime() - new Date(p1.timestamp).getTime()) / 1000;
        const speed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0;
        const elevation = p1.elevation ?? 0;
        if (elevation < minElev) minElev = elevation;
        if (elevation > maxElev) maxElev = elevation;
        if (speed < minSpeed) minSpeed = speed;
        if (speed > maxSpeed) maxSpeed = speed;
        segments.push({
            positions: [[p1.latitude, p1.longitude], [p2.latitude, p2.longitude]],
            speed,
            elevation,
        });
    }
    const lastPoint = points[points.length - 1];
    if (lastPoint.elevation < minElev) minElev = lastPoint.elevation;
    if (lastPoint.elevation > maxElev) maxElev = lastPoint.elevation;
    return { segments, minElev, maxElev, minSpeed, maxSpeed };
  }, [points]);

  const renderedPolyline = useMemo(() => {
    if (!processedData) {
        const positions = points.map(p => [p.latitude, p.longitude]);
        return <Polyline pathOptions={{ color: 'blue' }} positions={positions} />;
    }
    switch(viewMode) {
        case 'speed': return processedData.segments.map((seg, index) => <Polyline key={index} positions={seg.positions} pathOptions={{ color: getColorForValue(seg.speed, processedData.minSpeed, processedData.maxSpeed) }} />);
        case 'elevation': return processedData.segments.map((seg, index) => <Polyline key={index} positions={seg.positions} pathOptions={{ color: getColorForValue(seg.elevation, processedData.minElev, processedData.maxElev) }} />);
        default: return <Polyline pathOptions={{ color: 'blue' }} positions={points.map(p => [p.latitude, p.longitude])} />;
    }
  }, [viewMode, processedData, points]);

  const polylineBounds = useMemo(() => points.map(p => [p.latitude, p.longitude]), [points]);

  const chartData = useMemo(() => {
    if (points.length < 2) return [];
    const data = [{ distance: 0, speed: 0, elevation: points[0].elevation ?? 0 }];
    let cumulativeDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1]; const p2 = points[i];
      const segmentDistance = calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
      cumulativeDistance += segmentDistance;
      const timeDiff = (new Date(p2.timestamp).getTime() - new Date(p1.timestamp).getTime()) / 1000;
      const speed = timeDiff > 0 ? (segmentDistance / timeDiff) * 3.6 : 0;
      data.push({
        distance: cumulativeDistance / 1000,
        speed: parseFloat(speed.toFixed(1)),
        elevation: p2.elevation ? parseFloat(p2.elevation.toFixed(1)) : 0,
      });
    }
    return data;
  }, [points]);

  const handleDownloadGpx = () => {
    const gpxString = GenerateGpxContent(route.name, points);

    if(!gpxString){
      alert("Nie ma żadnych punktów do eksportu!");
      return;
    }

    const blob = new Blob([gpxString], {type: 'application/gpx+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const safeFileName = (route.name || "trasa").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `${safeFileName}.gpx`);

    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <Box sx={{ p: 3 }}><Skeleton variant="text" width="40%" height={40} /><Skeleton variant="rectangular" height={400} sx={{ my: 2 }} /><Skeleton variant="rectangular" height={150} /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error"><Typography>{error}</Typography><Button component={RouterLink} to="/Explore" sx={{ mt: 2 }}>Wróć do listy tras</Button></Alert></Box>;
  if (!route) return <Box sx={{ p: 3 }}><Typography>Trasa nie została znaleziona.</Typography></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>{route.name || "Trasa bez nazwy"}</Typography>
            <Typography variant="body1" color="text.secondary">{route.description || "Brak opisu."}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{mt: 1, display: 'block'}}>Utworzono: {formatDate(route.createdAt)}</Typography>
          </Box>
          
          <Button variant="contained" onClick={handleDownloadGpx} disabled={!points || points.length ===0}>
            Pobierz GPX
          </Button>

        </Paper>

        <Paper elevation={3} sx={{ position: 'relative', height: "60vh", minHeight: 400, width: "100%" }}>
            {polylineBounds.length > 0 ? (<>
                <MapContainer bounds={polylineBounds} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {renderedPolyline}
                    <Marker position={polylineBounds[0]}><Popup>Start</Popup></Marker>
                    <Marker position={polylineBounds[polylineBounds.length - 1]}><Popup>Koniec</Popup></Marker>
                </MapContainer>
                <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
                    <ButtonGroup variant="contained">
                        <Button onClick={() => setViewMode('default')} color={viewMode === 'default' ? 'primary' : 'inherit'}>Domyślny</Button>
                        <Button onClick={() => setViewMode('speed')} color={viewMode === 'speed' ? 'primary' : 'inherit'}>Prędkość</Button>
                        <Button onClick={() => setViewMode('elevation')} color={viewMode === 'elevation' ? 'primary' : 'inherit'}>Wysokość</Button>
                    </ButtonGroup>
                </Box>
            </>) : (<Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}><Typography color="text.secondary">Brak danych GPS do wyświetlenia mapy.</Typography></Box>)}
        </Paper>

        {chartData.length > 0 && (
          <Paper elevation={3} sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Wykres</Typography>
                <ButtonGroup variant="outlined" size="small">
                  <Button onClick={() => setChartType('speed')} variant={chartType === 'speed' ? 'contained' : 'outlined'}>Prędkość</Button>
                  <Button onClick={() => setChartType('elevation')} variant={chartType === 'elevation' ? 'contained' : 'outlined'}>Wysokość</Button>
                </ButtonGroup>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="distance" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(km) => `${km.toFixed(1)} km`} label={{ value: 'Dystans', position: 'insideBottom', offset: 0 }} />
                  <YAxis domain={['auto', 'auto']} label={{ value: chartType === 'speed' ? 'km/h' : 'm n.p.m.', angle: -90, position: 'insideLeft', dy: 40 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'Prędkość') return [`${value} km/h`, 'Prędkość'];
                      if (name === 'Wysokość') return [`${value} m`, 'Wysokość'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Dystans: ${label.toFixed(2)} km`}
                  />
                  <Legend verticalAlign="top" height={36} />
                  {chartType === 'speed' ? (
                    <Line type="monotone" dataKey="speed" name="Prędkość" stroke="#8884d8" strokeWidth={2} dot={false} />
                  ) : (
                    <Line type="monotone" dataKey="elevation" name="Wysokość" stroke="#82ca9d" strokeWidth={2} dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Stack>
          </Paper>
        )}

        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Statystyki trasy</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}><Chip label={`Dystans: ${formatDistance(route.stats.totalDistanceMeters)}`} sx={{width: '100%', py: 2}} /></Grid>
            <Grid item xs={12} sm={6} md={4}><Chip label={`Czas trwania: ${formatDuration(route.stats.durationSeconds)}`} sx={{width: '100%', py: 2}} /></Grid>
            <Grid item xs={12} sm={6} md={4}><Chip label={`Śr. prędkość: ${Number(route.stats.avgSpeedKmh).toFixed(1)} km/h`} sx={{width: '100%', py: 2}} /></Grid>
            <Grid item xs={12} sm={6} md={4}><Chip label={`Max. prędkość: ${Number(route.stats.maxSpeedKmh).toFixed(1)} km/h`} sx={{width: '100%', py: 2}} /></Grid>
            <Grid item xs={12} sm={6} md={4}><Chip label={`Przewyższenie: +${Number(route.stats.elevationGainMeters).toFixed(0)} m`} color="success" sx={{width: '100%', py: 2}} /></Grid>
            <Grid item xs={12} sm={6} md={4}><Chip label={`Spadek: -${Number(route.stats.elevationLossMeters).toFixed(0)} m`} color="error" sx={{width: '100%', py: 2}} /></Grid>
          </Grid>
        </Paper>
      </Stack>
    </Box>
  );
}

export default RouteDetails;