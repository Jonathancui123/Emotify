import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";

import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as serviceWorker from './serviceWorker';

import App from './views/App';
import Create from './views/CreatePage';


ReactDOM.render( <BrowserRouter>
    <Switch>
      <Route path="/home" render={props => <App {...props} />} />
      <Route path="/create" render={props => <Create {...props} />} />
      {/* <Route
        path="/landing-page"
        render={props => <LandingPage {...props} />}
      /> */}
      <Redirect from="/" to="/home" />
    </Switch>
  </BrowserRouter>,
  document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
