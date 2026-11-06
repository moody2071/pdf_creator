import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './ui/App'
import './ui/styles.css'
import { createMemoryDirectoryHandle } from './storage/workspace'
import { runPhase1Verification } from './verification/phase1-check'
import { runPhase2Verification } from './verification/phase2-check'
import { runPhase3Verification } from './verification/phase3-check'
import { runPhase4Verification } from './verification/phase4-check'

declare global {
  interface Window {
    __ANFAS_VERIFY_PHASE1__?: typeof runPhase1Verification
    __ANFAS_VERIFY_PHASE2__?: typeof runPhase2Verification
    __ANFAS_VERIFY_PHASE3__?: typeof runPhase3Verification
    __ANFAS_VERIFY_PHASE4__?: typeof runPhase4Verification
    __ANFAS_CREATE_MEMORY_DIR__?: typeof createMemoryDirectoryHandle
  }
}

if (typeof window !== 'undefined') {
  window.__ANFAS_VERIFY_PHASE1__ = runPhase1Verification
  window.__ANFAS_VERIFY_PHASE2__ = runPhase2Verification
  window.__ANFAS_VERIFY_PHASE3__ = runPhase3Verification
  window.__ANFAS_VERIFY_PHASE4__ = runPhase4Verification
  window.__ANFAS_CREATE_MEMORY_DIR__ = createMemoryDirectoryHandle
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
