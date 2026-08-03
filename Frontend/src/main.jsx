import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {BrowserRouter} from "react-router";
import {Provider} from "react-redux";
import {GoogleOAuthProvider} from "@react-oauth/google";
import {store} from "./store/store.js";
import {GroundProvider} from "./design/ground.jsx";
import {TooltipProvider} from "./design/overlays.jsx";
import {Toaster} from "./design/Toaster.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_OAUTH_CLIENT_ID}>
        <GroundProvider>
          <TooltipProvider>
            <BrowserRouter>
              <App/>
              <Toaster/>
            </BrowserRouter>
          </TooltipProvider>
        </GroundProvider>
      </GoogleOAuthProvider>
    </Provider>
  </StrictMode>,
)
