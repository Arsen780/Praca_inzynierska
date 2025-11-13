import React, { useState, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { Box, Paper, Typography, Stack, TextField, Button, ButtonGroup, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress } from "@mui/material";
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const API_URL = "https://localhost:7156";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

// ZMIANA: Komponent mapy teraz sprawdza, czy rysowanie jest aktywne
function MapEventsHandler({ onMapClick, isDrawingEnabled }) {
    useMapEvents({
        click(e) {
            if (isDrawingEnabled) {
                onMapClick(e.latlng);
            }
        },
    });
    return null;
}

function RouteCreator() {
    const history = useHistory();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState("Private");
    
    const [points, setPoints] = useState([]);
    
    // NOWY STAN: Kontroluje, czy można dodawać nowe punkty
    const [isDrawing, setIsDrawing] = useState(true); 
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const visibilityMap = {
        "Private" : 0,
        "Unlisted" : 1,
        "Public" : 2
    }

    const handleMapClick = (latlng) => {
        setPoints(prevPoints => [...prevPoints, latlng]);
    };

    const handleUndo = () => {
        setPoints(prevPoints => prevPoints.slice(0, -1));
    };

    // NOWA FUNKCJA: Resetuje trasę
    const handleReset = () => {
        if (window.confirm("Czy na pewno chcesz wyczyścić całą trasę i zacząć od nowa?")) {
            setPoints([]);
            setIsDrawing(true); // Upewnij się, że można znowu rysować
        }
    };
    
    // NOWA FUNKCJA: Przełącza tryb rysowania
    const handleToggleDrawing = () => {
        setIsDrawing(prev => !prev);
    };

    const totalDistance = useMemo(() => {
        let distance = 0;
        for (let i = 1; i < points.length; i++) {
            distance += calculateDistance(points[i-1].lat, points[i-1].lng, points[i].lat, points[i].lng);
        }
        return (distance / 1000).toFixed(2);
    }, [points]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (points.length < 2) {
            setError("Trasa musi składać się z co najmniej dwóch punktów.");
            return;
        }
        
        setLoading(true);
        const token = localStorage.getItem("jwtToken");
        if (!token) {
            setError("Musisz być zalogowany, aby stworzyć trasę.");
            setLoading(false);
            return;
        }

        const routeData = {
            name: name || "Nowa trasa",
            description: description,
            visibility: visibilityMap[visibility],
            points: points.map(p => ({ latitude: p.lat, longitude: p.lng }))
        };

        try {
            const response = await fetch(`${API_URL}/api/routes/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(routeData)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Nie udało się stworzyć trasy.");
            }
            history.push(`/routes/${data.id}`);
        } catch (err) {
            setError(err.message || "Wystąpił nieznany błąd.");
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h4" component="h1" gutterBottom>Kreator nowej trasy</Typography>
            <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                    {/* Sekcja formularza (bez zmian) */}
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Stack spacing={2}>
                            <TextField label="Nazwa trasy" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
                            <TextField label="Opis trasy" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={3} fullWidth />
                            <FormControl sx={{ minWidth: 200 }}>
                                <InputLabel>Widoczność</InputLabel>
                                <Select value={visibility} label="Widoczność" onChange={(e) => setVisibility(e.target.value)}>
                                    <MenuItem value={"Private"}>Prywatna</MenuItem>
                                    <MenuItem value={"Unlisted"}>Niepubliczna</MenuItem>
                                    <MenuItem value={"Public"}>Publiczna</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                    </Paper>

                    {/* Sekcja mapy */}
                    <Paper elevation={3} sx={{ position: 'relative', height: "60vh", minHeight: 400 }}>
                        <MapContainer center={[52.2297, 21.0122]} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                            <MapEventsHandler onMapClick={handleMapClick} isDrawingEnabled={isDrawing} />
                            {points.length > 0 && <Polyline positions={points} color="blue" />}
                            {points.map((p, index) => <Marker key={index} position={p} />)}
                        </MapContainer>
                        <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, p: 1, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }}>
                            <Typography variant="h6">Dystans: {totalDistance} km</Typography>
                            <Typography variant="body2">Punkty: {points.length}</Typography>
                        </Box>
                        {/* ZMIANA: Zestaw przycisków do zarządzania rysowaniem */}
                        <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
                            <Stack direction="row" spacing={1}>
                                <Button 
                                    variant="contained" 
                                    color="secondary" 
                                    onClick={handleUndo} 
                                    disabled={points.length === 0 || !isDrawing}
                                >
                                    Cofnij
                                </Button>
                                <Button 
                                    variant="contained"
                                    onClick={handleToggleDrawing}
                                    color={isDrawing ? "warning" : "success"}
                                    disabled={points.length === 0}
                                >
                                    {isDrawing ? "Zakończ rysowanie" : "Wznów rysowanie"}
                                </Button>
                                <Button 
                                    variant="contained"
                                    color="error"
                                    onClick={handleReset}
                                    disabled={points.length === 0}
                                >
                                    Resetuj
                                </Button>
                            </Stack>
                        </Box>
                    </Paper>

                    {error && <Alert severity="error">{error}</Alert>}

                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Button type="submit" variant="contained" size="large" fullWidth disabled={loading || points.length < 2}>
                            {loading ? <CircularProgress size={24} /> : "Stwórz trasę"}
                        </Button>
                    </Paper>
                </Stack>
            </form>
        </Box>
    );
}

export default RouteCreator;