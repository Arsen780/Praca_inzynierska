import { useState } from 'react'
import Login from './Login/Login'
import Registration from './Registration/Registration'
import Home from './Home/Home';
import UploadFile from './UploadFile/UploadFile';
import Navbar from './Navbar/Navbar';
import Account from './Account/Account';
import Explore from './Explore/Explore';
import ForgotPassword from './ForgotPassword/ForgotPassword';
import RouteDetails from './RouteDetails/RouteDetails';
import ChangePassword from './ChangePassword/ChangePassword';
import VerifyEmail from './VerifyEmail/VerifyEmail';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

function App() {
  return(
  <>
    <Router>
      <div className='content'>
        <Navbar/>
        <Switch>
          <Route exact path="/"> <Home/> </Route>
          <Route exact path ="/Login"> <Login/> </Route>
          <Route exact path="/Registration"> <Registration/> </Route>
          <Route exact path ="/UploadFile"> <UploadFile/> </Route>
          <Route exact path = "/Account"> <Account/></Route>
          <Route exact path = "/Explore"><Explore/></Route>
          <Route exact path = "/ForgotPassword"><ForgotPassword/></Route>
          <Route path="/verify-email/:token"><VerifyEmail /></Route>
          <Route path="/routes/:id"><RouteDetails /></Route>
          <Route path="/ChangePassword"><ChangePassword/></Route>
        </Switch>
      </div>
    </Router>
  </>
  )
}

export default App
