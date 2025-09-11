import { useState } from 'react'
import Login from './Login/Login'
import Registration from './Registration/Registration'
import Home from './Home/Home';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

function App() {
  return(
  <>
    <Router>
      <div className='content'>
        <Switch>
          <Route exact path="/"> <Home/> </Route>
          <Route exact path ="/Login"> <Login/> </Route>
          <Route exact path="/Registration"> <Registration/> </Route>
        </Switch>
      </div>
    </Router>
  </>
  )
}

export default App
