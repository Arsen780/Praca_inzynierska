import React, { useEffect, useMemo, useState } from "react";
import {Box,Paper,InputBase,Divider,IconButton,Grid,Card,CardContent,CardActions,CardActionArea,Typography,Chip,Skeleton,Button,Pagination, Stack, FormControl, InputLabel, Select, MenuItem} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Link as RouterLink } from "react-router-dom";

const API_URL = "https://localhost:7156";
const PAGE_SIZE = 15;

function formatDistance(meters) {
  if (meters == null) return "-";
  const km = meters / 1000;
  return `${km.toFixed(2)} km.`;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pl-PL");
}

function Explore() {
  const [search, setSearch] = useState("");
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

useEffect(() => {
    const fetchPublic = async () => {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      if (search) {
        params.append("q", search);
      }

      try {
        const res = await fetch(`${API_URL}/api/routes/public?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Błąd ${res.status}`);
        setRoutes(data || []);
      } catch (e) {
        setError(e.message || "Nie udało się pobrać tras.");
      } finally {
        setLoading(false);
      }
    };
    fetchPublic();
  }, [search, sortBy, sortOrder]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [routes, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRoutes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filtered.slice(start, end);
  }, [filtered, page]);

  const handlePageChange = (_e, value) => setPage(value);

  return (
    <Box sx={{ p: 2 }}>
      {/* Panel wyszukiwania i sortowania */}
<Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
  <Box component="form" onSubmit={(e) => e.preventDefault()} sx={{ display: 'flex', border: '1px solid #ccc', borderRadius: 1, flexGrow: 1, minWidth: '200px' }}>
    <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Wyszukaj trasę..." value={search} onChange={(e) => setSearch(e.target.value)} />
    <IconButton type="submit" sx={{ p: "10px" }} aria-label="search">
      <SearchIcon />
    </IconButton>
  </Box>
  <Stack direction="row" spacing={2} alignItems="center">
      <FormControl sx={{ minWidth: 180 }} size="small">
        <InputLabel id="sort-by-label">Sortuj według</InputLabel>
        <Select labelId="sort-by-label" label="Sortuj według" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
        >
          <MenuItem value="createdAt">Daty dodania</MenuItem>
          <MenuItem value="distance">Dystansu</MenuItem>
          <MenuItem value="duration">Czasu trwania</MenuItem>
        </Select>
      </FormControl>
      <Button variant="outlined" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
          {sortOrder === 'asc' ? 'Rosnąco' : 'Malejąco'}
      </Button>
  </Stack>
</Paper>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1 }}
              />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          Brak tras do wyświetlenia.
        </Typography>
      ) : (
        <>
          <Grid container spacing={3} sx={{ maxWidth: "100%" }}>
            {pagedRoutes.map((r) => {
              const dist = formatDistance(r?.stats?.totalDistanceMeters);
              const dur = formatDuration(r?.stats?.durationSeconds);
              const created = formatDate(r?.createdAt);
              const avg =
                r?.stats?.avgSpeedKmh != null
                  ? `${Number(r.stats.avgSpeedKmh).toFixed(1)} km/h`
                  : "—";

              return (
                <Grid item xs={12} sm={6} md={4} key={r.id}>
                  <Card
                    sx={{ height: "100%", display: "flex", flexDirection: "column"}}
                  >
                    <CardActionArea component={RouterLink} to={`/routes/${r.id}`}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom noWrap>
                          {r.name || "Bez nazwy"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} noWrap
                        >
                          {r.description || "—"}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          <Chip size="small" label={`Dystans: ${dist}`} />
                          <Chip size="small" label={`Czas: ${dur}`} />
                          <Chip size="small" label={`Śr. prędkość: ${avg}`} />
                        </Box>
                      </CardContent>
                    </CardActionArea>
                    <CardActions
                      sx={{ mt: "auto", justifyContent: "space-between", px: 2, pb: 2 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Utworzono: {created}
                      </Typography>
                      <Button
                        size="small" component={RouterLink} to={`/routes/${r.id}`} variant="outlined"
                      >
                        Szczegóły
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

export default Explore;