import React from 'react'
import ReactDOM from 'react-dom/client'
// Self-hosted, and only the three faces the design uses. Loading them from
// Google Fonts through an @import in the stylesheet cost about 750 ms of
// render blocking on mobile: HTML, then CSS, then Google's CSS, then the fonts.
import '@fontsource/caprasimo/400.css'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/600.css'
import './styles/index.css'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
