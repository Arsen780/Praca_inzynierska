import React, {useState, useContext, useEffect} from "react";
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import {Link, useLocation} from "react-router-dom"

const pagesLogout = {"/":'Strona główna', "/UploadFile":'Dodaj trasę', "/Explore":'Odkrywaj', "/Registration":"Zarejestruj się", "/Login":"Zaloguj się"};
const pagesLogin = {"/":'Strona główna', "/UploadFile":'Dodaj trasę', "/Explore":'Odkrywaj', "/RouteCreator":'Kreator Tras'};

const API_URL = "https://localhost:7156";
const DEFAULT_AVATAR = "/awatar.png";

function Navbar() {

    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("jwtToken"));
    const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
    const location = useLocation();
    const [anchorElNav, setAnchorElNav] = useState(null);

    const pages = isLoggedIn? pagesLogin : pagesLogout;

    const refreshAvatar = () => {
    const uid = localStorage.getItem("userId");
    if (isLoggedIn && uid) {
      setAvatarSrc(`${API_URL}/avatars/${uid}.jpg?t=${Date.now()}`);
    } else {
      setAvatarSrc(DEFAULT_AVATAR);
    }
  };

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("jwtToken"));
    refreshAvatar();
  }, [location]);

  useEffect(() => {
    const sync = () => {
      setIsLoggedIn(!!localStorage.getItem("jwtToken"));
      refreshAvatar();
    };
    window.addEventListener("auth", sync);
    return () => window.removeEventListener("auth", sync);
  }, []);

  const handleAvatarError = () => {
    if (avatarSrc !== DEFAULT_AVATAR) setAvatarSrc(DEFAULT_AVATAR);
  };


    const handleCloseNavMenu = (e) =>{
        setAnchorElNav(null);
    }

  return(
  <AppBar sx={{position:'static', marginBottom:'5px'}}>
    <Container maxWidth='xl'>
        <Toolbar>
            <Box component= "img" src = "/Logo.png" alt = "Logo" sx={{display:{xs:'none', md: 'flex'}, mr:1, height:60}} />
            <Typography sx={{mr:2, display:{xs:'none', md:'flex'}, fontFamily:"monospace", fontWeight:700, letterSpacing:'.1rem', color:'inherit' }}>
                GeoLog 
            </Typography>
            <Box sx={{flexGrow:1, display:{xs:'none', md:'flex'}}}>
                {
                    Object.keys(pages).map((path) =>{
                        const pageName = pages[path];
                        return(
                        <Button key={path} component={Link} to={path} onClick={handleCloseNavMenu} sx={{my:2, color:'white', display:'block'}}> {pageName} </Button>
                        );
                        })}
            </Box>
            {isLoggedIn &&
            <Box sx={{flexGrow:0}} >
                <Tooltip title="Mój profil">
                    <Link to="/Account">
                    <Avatar alt="Awatar" src={avatarSrc} onError={handleAvatarError}/>
                    </Link>
                </Tooltip>
            </Box>}
        </Toolbar>    
    </Container>
  </AppBar>
  )
}

export default Navbar
