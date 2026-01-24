import React from "react";
import {Box,Container,Typography,Button,Stack,Grid,Card,CardContent,CardMedia,Chip} from "@mui/material";
import CloudUpload from "@mui/icons-material/CloudUpload";
import ExploreIcon from "@mui/icons-material/Explore";
import EditLocationAlt from "@mui/icons-material/EditLocationAlt";
import Insights from "@mui/icons-material/Insights";
import {Link as RouterLink} from "react-router-dom";

function Home(){

  const isLoggedIn = Boolean(localStorage.getItem("jwtToken"));

  return(
    <Box sx={{pb:8}}>
      <Box sx={{py:{xs:6,md:10}, bgcolor:"background.default", borderBottom:(theme)=>`1px solid ${theme.palette.divider}`}}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Typography variant="h3" component="h1" fontWeight={700}>
                  GeoLog – Twoje trasy pod pełną kontrolą
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Prześlij plik GPX, narysuj trasę na mapie lub odkrywaj publiczne przejazdy innych użytkowników.
                  Analizuj dystans, prędkość, przewyższenia i wykrywaj błędy GPS.
                </Typography>

                <Stack direction={{xs:"column", sm:"row"}} spacing={2} sx={{mt:2}}>
                  {isLoggedIn ? (
                    <>
                      <Button variant="contained" size="large" startIcon={<CloudUpload/>} component={RouterLink} to="/UploadFile">
                        Prześlij trasę GPX
                      </Button>
                      <Button variant="outlined" size="large" startIcon={<EditLocationAlt/>} component={RouterLink} to="/RouteCreator" >
                        Kreator tras
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="contained" size="large" component={RouterLink} to="/Registration">
                        Załóż konto
                      </Button>
                      <Button variant="outlined" size="large" component={RouterLink} to="/Login">
                        Zaloguj się
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card elevation={4} sx={{borderRadius:3, overflow:"hidden"}}>
                <CardMedia component="img" height="280" image="/public/Home_Mapa.png" alt="Mapa z zaznaczoną trasą" />
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Analiza trasy na mapie
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Zobacz przebieg trasy na Google Maps lub OpenStreetMap, podejrzyj profil prędkości
                    i wysokości oraz statystyki przejazdu.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Sekcja funkcjonalności */}
      <Box sx={{py:{xs:6,md:8}}}>
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{mb:4}}>
            <Typography variant="h4" component="h2" fontWeight={700}>
              Co możesz zrobić w GeoLog?
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Aplikacja udostępnia kilka głównych modułów pracy z trasami GPS. Kliknij, aby przejść
              bezpośrednio do wybranej funkcjonalności.
            </Typography>
          </Stack>

          <Grid container spacing={3} justifyContent="center">

            <Grid item xs={12} md={10} lg={8}>
              <Card elevation={3}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <CloudUpload color="primary"/>
                    <Typography variant="h6">Prześlij trasę GPX</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Zaimportuj plik GPX z zegarka sportowego lub telefonu. System automatycznie policzy dystans,
                      czas, przewyższenia oraz wykryje błędy „teleportacji” GPS.
                    </Typography>
                  </Stack>
                </CardContent>
                <Box sx={{p:2, pt:0}}>
                  <Button fullWidth variant="outlined" component={RouterLink} to="/UploadFile" >
                    PRZEJDŹ DO UPLOADU
                  </Button>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={10} lg={8}>
              <Card elevation={3}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <ExploreIcon color="primary"/>
                    <Typography variant="h6">Odkrywaj trasy innych</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Przeglądaj publiczne trasy innych użytkowników. Filtruj, sortuj po dystansie lub czasie
                      i inspiruj się gotowymi przejazdami.
                    </Typography>
                  </Stack>
                </CardContent>
                <Box sx={{p:2, pt:0}}>
                  <Button fullWidth variant="outlined" component={RouterLink} to="/Explore" >
                    OTWÓRZ LISTĘ TRAS
                  </Button>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={10} lg={8}>
              <Card elevation={3}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <EditLocationAlt color="primary"/>
                    <Typography variant="h6">Rysuj trasę na mapie</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Zbuduj trasę ręcznie, klikając na mapę. Zobacz od razu wyliczony dystans oraz przebieg punktów.
                    </Typography>
                  </Stack>
                </CardContent>
                <Box sx={{p:2, pt:0}}>
                  <Button fullWidth variant="outlined" component={RouterLink} to="/RouteCreator" >
                    OTWÓRZ KREATOR TRAS
                  </Button>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={10} lg={8}>
              <Card elevation={3}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Insights color="primary"/>
                    <Typography variant="h6">Analiza szczegółowa</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dla każdej trasy możesz zobaczyć mapę, kolorowanie odcinków wg prędkości lub wysokości
                      oraz wykres prędkości i profilu wysokości.
                    </Typography>
                  </Stack>
                </CardContent>
                <Box sx={{p:2, pt:0}}>
                  <Button
                    fullWidth
                    variant="outlined"
                    component={RouterLink}
                    to="/Explore"
                  >
                    WYBIERZ TRASĘ DO ANALIZY
                  </Button>
                </Box>
              </Card>
            </Grid>

          </Grid>
        </Container>
      </Box>

      {/* Jak to działa */}
      <Box sx={{py:{xs:6,md:8}, bgcolor:"background.paper"}}>
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{mb:4}}>
            <Typography variant="h4" component="h2" fontWeight={700}>
              Jak to działa?
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Cały proces pracy z trasą sprowadza się do kilku prostych kroków.
            </Typography>
          </Stack>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Stack spacing={1.5}>
                <Typography variant="h6">1. Dodaj trasę</Typography>
                <Typography variant="body2" color="text.secondary">
                  Zaloguj się i prześlij plik GPX lub narysuj trasę w kreatorze. System zapisze wszystkie punkty
                  i obliczy statystyki.
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1.5}>
                <Typography variant="h6">2. Oczyść dane GPS</Typography>
                <Typography variant="body2" color="text.secondary">
                  W tle aplikacja wykrywa nielogiczne skoki (tzw. teleportacje) i koryguje trasę, aby statystyki
                  były jak najbardziej wiarygodne.
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1.5}>
                <Typography variant="h6">3. Analizuj i udostępniaj</Typography>
                <Typography variant="body2" color="text.secondary">
                  Przeglądaj trasę na mapie, analizuj wykresy prędkości i wysokości oraz decyduj,
                  czy trasa ma być prywatna czy publiczna.
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Sekcja z obrazkiem */}
      <Box sx={{py:{xs:6,md:8}}}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Card elevation={4} sx={{borderRadius:3, overflow:"hidden"}}>
                <CardMedia
                  component="img" height="280" image="/public/trasa_sc.png" alt="Wykres danych GPS" />
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={700}>
                  Wykres prędkości i profilu wysokości
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Dla każdej trasy możesz wyświetlić wykres zmiany prędkości oraz wysokości w funkcji dystansu.
                  To pozwala łatwo zidentyfikować trudniejsze fragmenty, podjazdy, zjazdy czy nielogiczne skoki danych.
                </Typography>
                <Button variant="contained" component={RouterLink} to="/Explore">
                  Zobacz przykładowe trasy
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}

export default Home;