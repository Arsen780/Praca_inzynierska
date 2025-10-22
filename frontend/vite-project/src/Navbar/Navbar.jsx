import React, {useState, useContext, useEffect} from "react";
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import AdbIcon from '@mui/icons-material/Adb';
import {Link, useLocation} from "react-router-dom"

const pagesLogout = {"/":'Strona główna', "/UploadFile":'Dodaj trasę', "/Explore":'Odkrywaj', "/Registration":"Zarejestruj się", "/Login":"Zaloguj się"};
const pagesLogin = {"/":'Strona główna', "/UploadFile":'Dodaj trasę', "/Explore":'Odkrywaj'};

function Navbar() {

    const [anchorElNav, setAnchorElNav] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("jwtToken"));
    const location = useLocation();

    const pages = isLoggedIn? pagesLogin : pagesLogout;

    useEffect(() => {
        const onAuth = () => setIsLoggedIn(!!localStorage.getItem('jwtToken'));
        window.addEventListener('auth', onAuth); // własne zdarzenie
        return () => window.removeEventListener('auth', onAuth);
        }, []);

    useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("jwtToken"));
    }, [location]);

    const handleOpenNavMenu = (e) => {
        setAnchorElNav(e.currentTarget);
    }

    const handleCloseNavMenu = (e) =>{
        setAnchorElNav(null);
    }

  return(
  <AppBar sx={{position:'static', marginBottom:'5px'}}>
    <Container maxWidth='xl'>
        <Toolbar>
            <AdbIcon sx={{display:{xs:'none', md:'flex'}, mr:1}} />
            <Typography sx={{mr:2, display:{xs:'none', md:'flex'}, fontFamily:"monospace", fontWeight:700, letterSpacing:'.3rem', color:'inherit' }}>
                Nazwa 
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
                    <Avatar alt="Awatar" src="/awatar.png"/>
                    </Link>
                </Tooltip>
            </Box>}
        </Toolbar>    
    </Container>
  </AppBar>
  )
}

export default Navbar
